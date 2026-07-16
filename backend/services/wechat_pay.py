from __future__ import annotations

import base64
import json
import secrets
import time
from pathlib import Path
from typing import Any, Mapping

import httpx
from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from config import settings


class WeChatPayError(RuntimeError):
    """Raised when WeChat Pay configuration or API validation fails."""


class WeChatPayClient:
    API_BASE = "https://api.mch.weixin.qq.com"
    JSAPI_PATH = "/v3/pay/transactions/jsapi"
    H5_PATH = "/v3/pay/transactions/h5"

    def __init__(self) -> None:
        self.app_id = settings.WX_APP_ID
        self.mch_id = settings.WECHAT_PAY_MCH_ID
        self.merchant_serial = settings.WECHAT_PAY_MCH_SERIAL_NO
        self.notify_url = settings.WECHAT_PAY_NOTIFY_URL
        self.public_key_id = settings.WECHAT_PAY_PUBLIC_KEY_ID
        self.api_v3_key = settings.WECHAT_PAY_API_V3_KEY
        self._private_key_path = settings.WECHAT_PAY_PRIVATE_KEY_PATH
        self._public_key_path = settings.WECHAT_PAY_PUBLIC_KEY_PATH
        self._private_key = None
        self._public_key = None

    @property
    def configured(self) -> bool:
        return all(
            (
                self.app_id,
                self.mch_id,
                self.merchant_serial,
                self.notify_url,
                self.public_key_id,
                self.api_v3_key,
                self._private_key_path,
                self._public_key_path,
            )
        )

    def require_configured(self) -> None:
        if not self.configured:
            raise WeChatPayError("微信支付配置不完整")
        if len(self.api_v3_key.encode("utf-8")) != 32:
            raise WeChatPayError("WECHAT_PAY_API_V3_KEY 必须是 32 字节")

    def _load_private_key(self):
        if self._private_key is None:
            try:
                pem = Path(self._private_key_path).read_bytes()
                self._private_key = serialization.load_pem_private_key(pem, password=None)
            except (OSError, ValueError) as exc:
                raise WeChatPayError("无法读取微信支付商户私钥") from exc
        return self._private_key

    def _load_public_key(self):
        if self._public_key is None:
            try:
                pem = Path(self._public_key_path).read_bytes()
                try:
                    self._public_key = serialization.load_pem_public_key(pem)
                except ValueError:
                    self._public_key = x509.load_pem_x509_certificate(pem).public_key()
            except (OSError, ValueError) as exc:
                raise WeChatPayError("无法读取微信支付公钥或平台证书") from exc
        return self._public_key

    def _sign(self, message: str) -> str:
        signature = self._load_private_key().sign(
            message.encode("utf-8"),
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return base64.b64encode(signature).decode("ascii")

    def build_authorization(
        self,
        method: str,
        canonical_url: str,
        body: str,
        *,
        timestamp: int | None = None,
        nonce: str | None = None,
    ) -> str:
        self.require_configured()
        timestamp = timestamp or int(time.time())
        nonce = nonce or secrets.token_hex(16)
        message = f"{method.upper()}\n{canonical_url}\n{timestamp}\n{nonce}\n{body}\n"
        signature = self._sign(message)
        return (
            'WECHATPAY2-SHA256-RSA2048 '
            f'mchid="{self.mch_id}",nonce_str="{nonce}",'
            f'signature="{signature}",timestamp="{timestamp}",'
            f'serial_no="{self.merchant_serial}"'
        )

    def verify_signature(
        self,
        headers: Mapping[str, str],
        body: str,
        *,
        now: int | None = None,
    ) -> None:
        self.require_configured()
        timestamp_text = headers.get("Wechatpay-Timestamp") or headers.get("wechatpay-timestamp")
        nonce = headers.get("Wechatpay-Nonce") or headers.get("wechatpay-nonce")
        signature_text = headers.get("Wechatpay-Signature") or headers.get("wechatpay-signature")
        serial = headers.get("Wechatpay-Serial") or headers.get("wechatpay-serial")
        if not all((timestamp_text, nonce, signature_text, serial)):
            raise WeChatPayError("微信支付签名头不完整")
        if serial != self.public_key_id:
            raise WeChatPayError("微信支付公钥 ID 不匹配")
        try:
            timestamp = int(timestamp_text)
        except ValueError as exc:
            raise WeChatPayError("微信支付时间戳无效") from exc
        current = now or int(time.time())
        if abs(current - timestamp) > 300:
            raise WeChatPayError("微信支付通知已过期")
        message = f"{timestamp_text}\n{nonce}\n{body}\n"
        try:
            self._load_public_key().verify(
                base64.b64decode(signature_text),
                message.encode("utf-8"),
                padding.PKCS1v15(),
                hashes.SHA256(),
            )
        except (InvalidSignature, ValueError) as exc:
            raise WeChatPayError("微信支付签名验证失败") from exc

    async def _post_order(self, path: str, payload: Mapping[str, Any], response_field: str) -> str:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        authorization = self.build_authorization("POST", path, body)
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{self.API_BASE}{path}",
                content=body.encode("utf-8"),
                headers={
                    "Authorization": authorization,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "User-Agent": "Probe/1.0",
                },
            )
        response_body = response.text
        self.verify_signature(response.headers, response_body)
        if response.status_code != 200:
            try:
                error = response.json()
                message = error.get("message") or error.get("code") or "微信支付下单失败"
            except ValueError:
                message = "微信支付下单失败"
            raise WeChatPayError(str(message))
        value = response.json().get(response_field)
        if not value:
            raise WeChatPayError(f"微信支付未返回 {response_field}")
        return str(value)

    async def create_jsapi_order(
        self,
        *,
        order_no: str,
        description: str,
        amount_cents: int,
        payer_openid: str,
    ) -> dict[str, str]:
        self.require_configured()
        payload = {
            "appid": self.app_id,
            "mchid": self.mch_id,
            "description": description[:127],
            "out_trade_no": order_no,
            "notify_url": self.notify_url,
            "amount": {"total": amount_cents, "currency": "CNY"},
            "payer": {"openid": payer_openid},
        }
        prepay_id = await self._post_order(self.JSAPI_PATH, payload, "prepay_id")
        return self.build_jsapi_params(prepay_id)

    async def create_h5_order(
        self,
        *,
        order_no: str,
        description: str,
        amount_cents: int,
        payer_client_ip: str,
    ) -> str:
        self.require_configured()
        payload = {
            "appid": self.app_id,
            "mchid": self.mch_id,
            "description": description[:127],
            "out_trade_no": order_no,
            "notify_url": self.notify_url,
            "amount": {"total": amount_cents, "currency": "CNY"},
            "scene_info": {
                "payer_client_ip": payer_client_ip,
                "h5_info": {
                    "type": "Wap",
                    "app_name": "Probe",
                    "app_url": settings.PUBLIC_WEB_URL,
                },
            },
        }
        return await self._post_order(self.H5_PATH, payload, "h5_url")

    def build_jsapi_params(
        self,
        prepay_id: str,
        *,
        timestamp: int | None = None,
        nonce: str | None = None,
    ) -> dict[str, str]:
        timestamp_text = str(timestamp or int(time.time()))
        nonce = nonce or secrets.token_hex(16)
        package = f"prepay_id={prepay_id}"
        message = f"{self.app_id}\n{timestamp_text}\n{nonce}\n{package}\n"
        return {
            "appId": self.app_id,
            "timeStamp": timestamp_text,
            "nonceStr": nonce,
            "package": package,
            "signType": "RSA",
            "paySign": self._sign(message),
        }

    def decrypt_callback_resource(self, resource: Mapping[str, Any]) -> dict[str, Any]:
        self.require_configured()
        try:
            ciphertext = base64.b64decode(str(resource["ciphertext"]))
            nonce = str(resource["nonce"]).encode("utf-8")
            associated_data = str(resource.get("associated_data") or "").encode("utf-8")
            plaintext = AESGCM(self.api_v3_key.encode("utf-8")).decrypt(
                nonce,
                ciphertext,
                associated_data,
            )
            return json.loads(plaintext.decode("utf-8"))
        except (KeyError, ValueError, TypeError, json.JSONDecodeError) as exc:
            raise WeChatPayError("微信支付回调解密失败") from exc


wechat_pay_client = WeChatPayClient()
