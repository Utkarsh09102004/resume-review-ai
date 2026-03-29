import logging
from typing import Any

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://resumeforge:devpassword@localhost:5434/resumeforge"
    TEXLIVE_URL: str = "http://localhost:3001"
    AUTH_ENABLED: bool = True
    LOGTO_JWKS_URL: str = ""
    LOGTO_APP_ID: str = ""
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env")

    def model_post_init(self, __context: Any) -> None:
        super().model_post_init(__context)
        if self.AUTH_ENABLED and not self.LOGTO_APP_ID:
            raise ValueError(
                "LOGTO_APP_ID must be set when AUTH_ENABLED=true. "
                "JWT audience verification cannot be disabled in production."
            )


settings = Settings()

if not settings.AUTH_ENABLED:
    logger.warning("AUTH_ENABLED=false — all requests bypass authentication (dev-user). Not for production use.")
