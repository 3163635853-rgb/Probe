from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Probe"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "mysql+aiomysql://probe:probe@localhost:3306/probe"

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
    EMBEDDING_MODEL: str = "text-embedding-v1"
    EMBEDDING_DIM: int = 1024
    TRANSCRIPTION_API_KEY: str = ""
    TRANSCRIPTION_BASE_URL: str = "https://api.openai.com/v1"
    TRANSCRIPTION_MODEL: str = "whisper-1"

    # WeChat / WeChat Pay API v3
    WX_APP_ID: str = ""
    WX_APP_SECRET: str = ""
    WX_WEB_APP_ID: str = ""
    WX_WEB_APP_SECRET: str = ""
    WX_MOBILE_APP_ID: str = ""
    WX_MOBILE_APP_SECRET: str = ""
    WECHAT_PAY_MCH_ID: str = ""
    WECHAT_PAY_MCH_SERIAL_NO: str = ""
    WECHAT_PAY_PRIVATE_KEY_PATH: str = ""
    WECHAT_PAY_PUBLIC_KEY_ID: str = ""
    WECHAT_PAY_PUBLIC_KEY_PATH: str = ""
    WECHAT_PAY_API_V3_KEY: str = ""
    WECHAT_PAY_NOTIFY_URL: str = ""

    # Public URLs and generated assets
    PUBLIC_API_URL: str = "http://localhost:8000"
    PUBLIC_WEB_URL: str = "http://localhost:3000"
    SHARE_STORAGE_DIR: str = "data/share_images"
    SHARE_FONT_PATH: str = ""
    UPLOAD_STORAGE_DIR: str = "data/uploads"

    # Mobile release and reminders
    APP_LATEST_VERSION: str = "1.1.0"
    APP_MIN_VERSION: str = "1.0.0"
    APP_FORCE_UPDATE: bool = False
    APP_UPDATE_URL: str = ""
    DAILY_REMINDER_ENABLED: bool = True
    DAILY_REMINDER_HOUR: int = 20
    DAILY_REMINDER_INTERVAL_SEC: int = 1800

    # Quota
    FREE_MONTHLY_QUOTA: int = 3

    # Session
    SESSION_TTL: int = 7200  # 2h, Redis session/memory expiry

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://68.183.224.222:3100"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

# 生产环境安全检查
if not settings.DEBUG and (
    settings.JWT_SECRET == "change-me-in-production" or len(settings.JWT_SECRET.encode("utf-8")) < 32
):
    raise RuntimeError("JWT_SECRET must be at least 32 bytes in production.")
