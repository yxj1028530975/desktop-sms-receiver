import json
from typing import Annotated
from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="SMS Desktop Notifier", alias="APP_NAME")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    database_url: str = Field(default="sqlite:///./data/sms.db", alias="DATABASE_URL")
    log_dir: str = Field(default="./logs", alias="LOG_DIR")
    inbound_api_key: str = Field(default="change-this-inbound-key", alias="INBOUND_API_KEY")
    admin_username: str = Field(default="admin", alias="ADMIN_USERNAME")
    admin_password: str = Field(default="admin123", alias="ADMIN_PASSWORD")
    admin_session_secret: str = Field(default="change-this-session-secret", alias="ADMIN_SESSION_SECRET")
    allowed_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://127.0.0.1:5173"],
        alias="ALLOWED_ORIGINS",
    )
    max_history_items: int = Field(default=200, alias="MAX_HISTORY_ITEMS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_sqlite_path(cls, value: str) -> str:
        if not isinstance(value, str):
            return value

        if value.startswith("sqlite:///./"):
            relative_path = value.removeprefix("sqlite:///./")
            backend_root = Path(__file__).resolve().parents[1]
            absolute_path = (backend_root / relative_path).resolve()
            return f"sqlite:///{absolute_path.as_posix()}"

        return value

    @field_validator("log_dir", mode="before")
    @classmethod
    def normalize_log_dir(cls, value: str) -> str:
        if not isinstance(value, str):
            return value

        log_path = Path(value)
        if not log_path.is_absolute():
            backend_root = Path(__file__).resolve().parents[1]
            log_path = (backend_root / log_path).resolve()
        return log_path.as_posix()

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def split_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                parsed = json.loads(stripped)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
