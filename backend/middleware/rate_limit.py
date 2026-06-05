from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from db.redis import redis_client
from utils.jwt import decode_token


class RateLimitMiddleware(BaseHTTPMiddleware):
    """30 req/min per user, 10 req/min per IP for unauthenticated"""

    async def dispatch(self, request: Request, call_next):
        # Skip health check
        if request.url.path == "/health":
            return await call_next(request)

        # Identify caller
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            payload = decode_token(auth_header[7:])
            if payload:
                key = f"rate:{payload['sub']}"
                limit = 30
            else:
                key = f"rate:ip:{request.client.host}"
                limit = 10
        else:
            key = f"rate:ip:{request.client.host}"
            limit = 10

        try:
            current = await redis_client.incr(key)
            if current == 1:
                await redis_client.expire(key, 60)
            if current > limit:
                return JSONResponse(
                    status_code=429,
                    content={"code": 42900, "message": "请求过于频繁，请稍后再试"},
                    headers={"Retry-After": "60"},
                )
        except Exception:
            # Redis down → 不限流，降级通过
            pass

        return await call_next(request)
