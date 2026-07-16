from datetime import datetime, timedelta, timezone
import jwt
from config import settings

ALGORITHM = settings.JWT_ALGORITHM
SECRET = settings.JWT_SECRET
EXPIRE_DAYS = settings.JWT_EXPIRE_DAYS
RENEW_THRESHOLD_HOURS = 24


def create_token(user_id: int, uuid: str) -> tuple[str, datetime]:
    expires = datetime.now(timezone.utc) + timedelta(days=EXPIRE_DAYS)
    payload = {"sub": str(user_id), "uuid": uuid, "exp": expires}
    token = jwt.encode(payload, SECRET, algorithm=ALGORITHM)
    return token, expires


def decode_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def should_renew(payload: dict) -> bool:
    """Token 到期前 24h 内自动续签"""
    exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    remaining = exp - datetime.now(timezone.utc)
    return remaining < timedelta(hours=RENEW_THRESHOLD_HOURS)
