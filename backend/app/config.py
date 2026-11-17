"""Application settings, read once from the environment (prefix SURVEILLED_) or backend/.env."""

from datetime import date
from functools import lru_cache

from pydantic import Field, HttpUrl, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

_MIN_SALT_LENGTH = 16


class ConfigurationError(RuntimeError):
    """A required setting is missing or unusable. Raised at startup, before serving anyone."""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="SURVEILLED_", env_file=".env", env_ignore_empty=True, extra="ignore"
    )

    daily_salt: SecretStr | None = Field(
        default=None,
        description="Required. Secret mixed into the daily seeds so records can't be precomputed.",
    )
    launch_day: date = Field(default=date(2026, 11, 16), description="Day 1 of the daily game.")
    cookie_secure: bool = Field(
        default=False, description="Send the player cookie over HTTPS only. True in production."
    )
    dev_mode: bool = Field(
        default=False,
        description="Enables developer tools, such as resetting your own day. Off in production.",
    )
    max_active_runs: int = Field(
        default=50_000,
        ge=1,
        description="Player-days kept in memory before the least recently used is dropped.",
    )

    supabase_url: HttpUrl | None = Field(
        default=None,
        description="The Supabase project URL. Without it (and the secret key) standings are off.",
    )
    supabase_secret_key: SecretStr | None = Field(
        default=None,
        description="The project's secret key (sb_secret_...) or legacy service_role key. Server "
        "only: it bypasses row level security. Never give it a VITE_ prefix.",
    )
    standing_min_players: int = Field(
        default=10,
        ge=1,
        description="Finished days needed before a day's standing is shown as a percentage.",
    )

    @property
    def supabase_configured(self) -> bool:
        return self.supabase_url is not None and self.supabase_secret_key is not None

    def require_daily_salt(self) -> str:
        """The salt, or a ConfigurationError saying how to set it."""
        if self.daily_salt is None or len(self.daily_salt.get_secret_value()) < _MIN_SALT_LENGTH:
            raise ConfigurationError(
                f"Set SURVEILLED_DAILY_SALT ({_MIN_SALT_LENGTH}+ characters) in the environment "
                "or backend/.env. See backend/.env.example."
            )
        return self.daily_salt.get_secret_value()


@lru_cache
def get_settings() -> Settings:
    return Settings()
