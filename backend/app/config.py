"""Application configuration using environment variables."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "HousingIQ API"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: Literal["development", "staging", "production"] = "development"

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "https://housingiq-frontend.vercel.app",
    ]

    # Database (for future use)
    database_url: str = ""

    # API
    api_v1_prefix: str = "/api"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

