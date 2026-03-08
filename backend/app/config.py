from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./impactmatch.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    AUTH0_DOMAIN: str = ""
    AUTH0_AUDIENCE: str = ""

    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""

    APP_JWT_SECRET: str = "change-me-in-production"
    APP_JWT_EXPIRE_HOURS: int = 24

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GEMINI_EMBED_MODEL: str = "gemini-embedding-001"
    MAPBOX_SECRET_TOKEN: str = ""

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    DISCORD_WEBHOOK_URL: str = ""

    ENVIRONMENT: str = "development"
    ALLOWED_ORIGINS: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
