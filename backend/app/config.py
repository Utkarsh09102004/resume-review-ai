from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://resumeforge:devpassword@localhost:5434/resumeforge"
    TEXLIVE_URL: str = "http://localhost:3001"
    AUTH_ENABLED: bool = False
    LOGTO_JWKS_URL: str = "http://localhost:3001/oidc/jwks"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
