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

    # DeepSeek
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com/v1"

    # WeChat
    WX_APP_ID: str = ""
    WX_APP_SECRET: str = ""

    # Quota
    FREE_MONTHLY_QUOTA: int = 3

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
