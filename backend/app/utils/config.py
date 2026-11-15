"""Application configuration settings for the multi-college student chatbot backend."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables or defaults."""

    app_name: str = "AI-Powered Multi-College Student Chatbot API"
    app_version: str = "1.0.0"
    faq_backend: str = Field(default="json", description="Active FAQ backend ('json' or 'postgres').")
    confidence_threshold: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Optional override for intent classification confidence threshold.",
    )
    database_url: str | None = Field(
        default=None,
        description="Optional PostgreSQL SQLAlchemy connection string.",
    )

    admin_username: str | None = Field(
        default=None,
        description="Admin username required via ADMIN_USERNAME environment variable.",
    )
    admin_password: str | None = Field(
        default=None,
        description="Admin password required via ADMIN_PASSWORD environment variable if hash not provided.",
    )
    admin_password_hash: str | None = Field(
        default=None,
        description="Optional pre-computed salted PBKDF2 hash via ADMIN_PASSWORD_HASH.",
    )
    admin_jwt_secret: str | None = Field(
        default=None,
        description="Cryptographic secret key (at least 32 characters) for signing admin JWT tokens via ADMIN_JWT_SECRET.",
    )
    admin_jwt_algorithm: str = "HS256"
    admin_token_expiry_minutes: int = 1440

    revoked_tokens_path: Path = PROJECT_ROOT / "backend" / "app" / "data" / "revoked_tokens.json"
    feedback_path: Path = PROJECT_ROOT / "backend" / "app" / "data" / "student_feedback.json"

    intents_path: Path = PROJECT_ROOT / "dataset" / "processed" / "student_intents.json"
    colleges_path: Path = PROJECT_ROOT / "dataset" / "processed" / "colleges.json"
    college_faq_path: Path = PROJECT_ROOT / "dataset" / "processed" / "college_faq.json"
    models_dir: Path = PROJECT_ROOT / "backend" / "app" / "models"

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / "backend" / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()

