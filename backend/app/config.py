from functools import lru_cache
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_async_database_url(url: str) -> str:
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    parsed = urlparse(url)
    query = parse_qs(parsed.query, keep_blank_values=True)

    if "sslmode" in query:
        query.pop("sslmode", None)
        query["ssl"] = ["require"]

    query.pop("channel_binding", None)

    flat_query = {key: values[-1] for key, values in query.items() if values}
    return urlunparse(parsed._replace(query=urlencode(flat_query)))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Docker: project root .env is mounted at /etc/english-project.env
        # Local: run from backend/ and load ../.env
        env_file=("/etc/english-project.env", "../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(alias="DATABASE_URL")
    database_url_raw: str = Field(alias="DATABASE_URL_RAW")
    openai_api_key: str = Field(alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")
    openai_tts_model: str = Field(default="tts-1", alias="OPENAI_TTS_MODEL")
    openai_tts_voice: str = Field(default="onyx", alias="OPENAI_TTS_VOICE")
    openai_transcribe_model: str = Field(default="whisper-1", alias="OPENAI_TRANSCRIBE_MODEL")
    jwt_secret: str = Field(alias="JWT_SECRET")
    jwt_lifetime_seconds: int = Field(default=3600, alias="JWT_LIFETIME_SECONDS")
    cors_origins: str = Field(default="http://localhost:5173", alias="CORS_ORIGINS")
    trust_x_forwarded_for: bool = Field(default=False, alias="TRUST_X_FORWARDED_FOR")

    sqlalchemy_pool_size: int = Field(default=5, alias="SQLALCHEMY_POOL_SIZE")
    sqlalchemy_max_overflow: int = Field(default=5, alias="SQLALCHEMY_MAX_OVERFLOW")
    asyncpg_pool_min_size: int = Field(default=1, alias="ASYNCPG_POOL_MIN_SIZE")
    asyncpg_pool_max_size: int = Field(default=10, alias="ASYNCPG_POOL_MAX_SIZE")

    login_rate_limit_window_seconds: int = Field(default=60, alias="LOGIN_RATE_LIMIT_WINDOW_SECONDS")
    login_rate_limit_max_attempts: int = Field(default=10, alias="LOGIN_RATE_LIMIT_MAX_ATTEMPTS")
    register_rate_limit_window_seconds: int = Field(
        default=300,
        alias="REGISTER_RATE_LIMIT_WINDOW_SECONDS",
    )
    register_rate_limit_max_attempts: int = Field(
        default=10,
        alias="REGISTER_RATE_LIMIT_MAX_ATTEMPTS",
    )

    openai_message_rate_limit_per_minute: int = Field(
        default=20,
        alias="OPENAI_MESSAGE_RATE_LIMIT_PER_MINUTE",
    )
    openai_message_rate_limit_per_day: int = Field(
        default=200,
        alias="OPENAI_MESSAGE_RATE_LIMIT_PER_DAY",
    )
    openai_feedback_rate_limit_per_minute: int = Field(
        default=10,
        alias="OPENAI_FEEDBACK_RATE_LIMIT_PER_MINUTE",
    )
    openai_feedback_rate_limit_per_day: int = Field(
        default=50,
        alias="OPENAI_FEEDBACK_RATE_LIMIT_PER_DAY",
    )

    password_min_length: int = Field(default=8, alias="PASSWORD_MIN_LENGTH")
    scenario_text_max_length: int = Field(default=2000, alias="SCENARIO_TEXT_MAX_LENGTH")
    scenario_field_max_length: int = Field(default=500, alias="SCENARIO_FIELD_MAX_LENGTH")
    feedback_message_max_count: int = Field(default=100, alias="FEEDBACK_MESSAGE_MAX_COUNT")
    session_list_default_limit: int = Field(default=20, alias="SESSION_LIST_DEFAULT_LIMIT")
    session_list_max_limit: int = Field(default=100, alias="SESSION_LIST_MAX_LIMIT")
    message_list_default_limit: int = Field(default=50, alias="MESSAGE_LIST_DEFAULT_LIMIT")
    message_list_max_limit: int = Field(default=200, alias="MESSAGE_LIST_MAX_LIMIT")
    saved_item_list_default_limit: int = Field(default=50, alias="SAVED_ITEM_LIST_DEFAULT_LIMIT")
    saved_item_list_max_limit: int = Field(default=200, alias="SAVED_ITEM_LIST_MAX_LIMIT")

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 64:
            raise ValueError("JWT_SECRET must be at least 64 characters long")
        if "your-random-secret" in normalized.lower():
            raise ValueError("JWT_SECRET must not use placeholder values")
        return normalized

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def database_url_async(self) -> str:
        return _normalize_async_database_url(self.database_url)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
