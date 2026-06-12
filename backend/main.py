from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from contextlib import asynccontextmanager
from sqlalchemy import text

from config import settings
from utils.logging import setup_logging
from db.mysql import engine
from db.redis import redis_client
from api.auth import router as auth_router
from api.config import router as config_router
from api.quota import router as quota_router
from api.interview import router as interview_router
from api.interview_stream import router as interview_stream_router
from api.feedback import router as feedback_router
from api.payment import router as payment_router
from api.subscription import router as subscription_router
from api.speech import router as speech_router
from api.invite import router as invite_router
from api.notification import router as notification_router
from api.coupon import router as coupon_router
from api.achievement import router as achievement_router
from api.share import router as share_router
from api.file import router as file_router
from middleware.rate_limit import RateLimitMiddleware

setup_logging(debug=settings.DEBUG)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await redis_client.ping()
    yield
    await redis_client.aclose()
    await engine.dispose()


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

# Middleware（Starlette 栈：后 add 的先执行）
# RateLimitMiddleware 先注册 → 后执行
app.add_middleware(RateLimitMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-New-Token"],
)

# Routers
app.include_router(auth_router)
app.include_router(config_router)
app.include_router(quota_router)
app.include_router(interview_router)
app.include_router(interview_stream_router)
app.include_router(feedback_router)
app.include_router(payment_router)
app.include_router(subscription_router)
app.include_router(speech_router)
app.include_router(invite_router)
app.include_router(notification_router)
app.include_router(coupon_router)
app.include_router(achievement_router)
app.include_router(share_router)
app.include_router(file_router)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"code": exc.status_code, "message": exc.detail})


@app.get("/health")
async def health():
    mysql_ok = True
    redis_ok = True
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        mysql_ok = False
    try:
        await redis_client.ping()
    except Exception:
        redis_ok = False
    return {
        "status": "ok" if (mysql_ok and redis_ok) else "degraded",
        "mysql": "ok" if mysql_ok else "error",
        "redis": "ok" if redis_ok else "error",
    }
