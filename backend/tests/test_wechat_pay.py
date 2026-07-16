import base64
import json
import re
import time
from types import SimpleNamespace

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from config import settings
from services.wechat_pay import WeChatPayClient


def configured_client(tmp_path, monkeypatch):
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_path = tmp_path / "merchant.pem"
    public_path = tmp_path / "wechat.pub.pem"
    private_path.write_bytes(
        private_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    public_path.write_bytes(
        private_key.public_key().public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        )
    )
    values = {
        "WX_APP_ID": "wx-test-app",
        "WECHAT_PAY_MCH_ID": "1900000001",
        "WECHAT_PAY_MCH_SERIAL_NO": "MERCHANT_SERIAL",
        "WECHAT_PAY_PRIVATE_KEY_PATH": str(private_path),
        "WECHAT_PAY_PUBLIC_KEY_ID": "PUB_KEY_ID_TEST",
        "WECHAT_PAY_PUBLIC_KEY_PATH": str(public_path),
        "WECHAT_PAY_API_V3_KEY": "0123456789abcdef0123456789abcdef",
        "WECHAT_PAY_NOTIFY_URL": "https://api.example.com/api/payment/webhook",
    }
    for name, value in values.items():
        monkeypatch.setattr(settings, name, value)
    return WeChatPayClient(), private_key


def test_authorization_signature_is_valid(tmp_path, monkeypatch):
    client, private_key = configured_client(tmp_path, monkeypatch)
    body = '{"hello":"world"}'
    header = client.build_authorization(
        "POST", "/v3/pay/transactions/jsapi", body, timestamp=1720000000, nonce="nonce-1"
    )
    signature = re.search(r'signature="([^"]+)"', header).group(1)
    message = "POST\n/v3/pay/transactions/jsapi\n1720000000\nnonce-1\n" + body + "\n"
    private_key.public_key().verify(
        base64.b64decode(signature),
        message.encode(),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )


def test_verify_callback_and_decrypt_resource(tmp_path, monkeypatch):
    client, private_key = configured_client(tmp_path, monkeypatch)
    plaintext = json.dumps({"out_trade_no": "PROBE1", "trade_state": "SUCCESS"}).encode()
    nonce = b"123456789012"
    associated = b"transaction"
    ciphertext = AESGCM(client.api_v3_key.encode()).encrypt(nonce, plaintext, associated)
    resource = {
        "ciphertext": base64.b64encode(ciphertext).decode(),
        "nonce": nonce.decode(),
        "associated_data": associated.decode(),
    }
    assert client.decrypt_callback_resource(resource)["out_trade_no"] == "PROBE1"

    body = json.dumps({"event_type": "TRANSACTION.SUCCESS", "resource": resource})
    timestamp = str(int(time.time()))
    message = f"{timestamp}\ncallback-nonce\n{body}\n"
    signature = private_key.sign(message.encode(), padding.PKCS1v15(), hashes.SHA256())
    client.verify_signature(
        {
            "Wechatpay-Timestamp": timestamp,
            "Wechatpay-Nonce": "callback-nonce",
            "Wechatpay-Signature": base64.b64encode(signature).decode(),
            "Wechatpay-Serial": "PUB_KEY_ID_TEST",
        },
        body,
    )


def test_jsapi_params_signature_is_valid(tmp_path, monkeypatch):
    client, private_key = configured_client(tmp_path, monkeypatch)
    params = client.build_jsapi_params("wx-prepay", timestamp=1720000000, nonce="nonce-2")
    message = "wx-test-app\n1720000000\nnonce-2\nprepay_id=wx-prepay\n"
    private_key.public_key().verify(
        base64.b64decode(params["paySign"]),
        message.encode(),
        padding.PKCS1v15(),
        hashes.SHA256(),
    )
    assert params["signType"] == "RSA"
