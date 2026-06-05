from fastapi import FastAPI
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
from middleware.rate_limit import RateLimitMiddleware

setup_logging(debug=settings.DEBUG)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await redis_client.ping()
    yield
    await redis_client.aclose()
    await engine.dispose()


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

# Middleware
app.add_middleware(RateLimitMiddleware)

# Routers
app.include_router(auth_router)
app.include_router(config_router)
app.include_router(quota_router)
app.include_router(interview_router)
app.include_router(interview_stream_router)
app.include_router(feedback_router)


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
