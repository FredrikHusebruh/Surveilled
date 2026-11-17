from pathlib import Path

import pytest
from pydantic import ValidationError

from app.config import ConfigurationError, Settings


@pytest.fixture(autouse=True)
def no_env_file(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Read settings from the environment only, never from a developer's backend/.env."""
    monkeypatch.chdir(tmp_path)


def test_settings_read_the_surveilled_prefix(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SURVEILLED_MAX_ACTIVE_RUNS", "7")
    monkeypatch.setenv("SURVEILLED_LAUNCH_DAY", "2027-01-01")

    settings = Settings()

    assert settings.max_active_runs == 7
    assert settings.launch_day.isoformat() == "2027-01-01"


def test_settings_reject_a_store_with_no_room(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SURVEILLED_MAX_ACTIVE_RUNS", "0")

    with pytest.raises(ValidationError):
        Settings()


def test_empty_supabase_settings_leave_standings_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SURVEILLED_SUPABASE_URL", "")
    monkeypatch.setenv("SURVEILLED_SUPABASE_SECRET_KEY", "")

    assert not Settings().supabase_configured


def test_a_url_and_secret_key_turn_standings_on(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SURVEILLED_SUPABASE_URL", "https://abc.supabase.co")
    monkeypatch.setenv("SURVEILLED_SUPABASE_SECRET_KEY", "sb_secret_abc")

    assert Settings().supabase_configured


def test_a_missing_or_short_salt_is_refused_with_instructions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("SURVEILLED_DAILY_SALT", raising=False)
    with pytest.raises(ConfigurationError, match="SURVEILLED_DAILY_SALT"):
        Settings().require_daily_salt()

    monkeypatch.setenv("SURVEILLED_DAILY_SALT", "short")
    with pytest.raises(ConfigurationError):
        Settings().require_daily_salt()

    monkeypatch.setenv("SURVEILLED_DAILY_SALT", "a-long-enough-salt")
    assert Settings().require_daily_salt() == "a-long-enough-salt"
