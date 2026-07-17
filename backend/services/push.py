"""Expo Push Notification 服务"""
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push(push_token: str, title: str, body: str, data: Optional[dict] = None):
    """发送推送通知到单个设备"""
    if not push_token or not push_token.startswith(("ExponentPushToken", "ExpoPushToken")):
        return

    message = {
        "to": push_token,
        "title": title,
        "body": body,
        "sound": "default",
    }
    if data:
        message["data"] = data

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(EXPO_PUSH_URL, json=message, timeout=10)
            if resp.status_code != 200:
                logger.warning(f"Push failed: {resp.status_code} {resp.text}")
    except Exception as e:
        logger.warning(f"Push send error: {e}")
