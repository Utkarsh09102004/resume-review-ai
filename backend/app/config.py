import logging

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://resumeforge:devpassword@localhost:5434/resumeforge"
    TEXLIVE_URL: str = "http://localhost:3001"
    AUTH_ENABLED: bool = False
    LOGTO_JWKS_URL: str = ""
    LOGTO_APP_ID: str = ""
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()

if not settings.AUTH_ENABLED:
    logger.warning("AUTH_ENABLED=false — all requests will use 'dev-user'. Do not run in production like this.")
