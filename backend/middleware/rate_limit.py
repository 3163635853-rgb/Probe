from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from db.redis import redis_client
from utils.jwt import decode_token


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting: 60 req/min per user, 30 req/min per IP for unauthenticated"""

    async def dispatch(self, request: Request, call_next):
        # Skip health check and OPTIONS preflight
        if request.url.path == "/health" or request.method == "OPTIONS":
            return await call_next(request)

        # Identify caller
        client_host = request.client.host if request.client else "unknown"
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            payload = decode_token(auth_header[7:])
            if payload:
                key = f"rate:{payload['sub']}"
                limit = 60
            else:
                key = f"rate:ip:{client_host}"
                limit = 30
        else:
            # SSE stream 的 token 在 query param 里
            token = request.query_params.get("token")
            if token:
                payload = decode_token(token)
                if payload:
                    key = f"rate:{payload['sub']}"
                    limit = 60
                else:
                    key = f"rate:ip:{client_host}"
                    limit = 30
            else:
                key = f"rate:ip:{client_host}"
                limit = 30

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
