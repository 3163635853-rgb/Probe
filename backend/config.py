from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Probe"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "mysql+asyncmy://probe:probe@localhost:3306/probe"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7

    # LLM (OpenAI 兼容接口)
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://token-plan-cn.xiaomimimo.com/v1"
    DEEPSEEK_MODEL: str = "mimo-v2-pro"

    # WeChat
    WX_APP_ID: str = ""
    WX_APP_SECRET: str = ""

    # Quota
    FREE_MONTHLY_QUOTA: int = 3

    # Session
    SESSION_TTL: int = 7200  # 2h, Redis session/memory expiry

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

# 生产环境安全检查
if not settings.DEBUG and settings.JWT_SECRET == "change-me-in-production":
    raise RuntimeError("JWT_SECRET must be set in production. Check your .env file.")
