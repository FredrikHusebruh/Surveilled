"""Shared fixtures: daily records built from small hand-drawn boards, a fake clock, a fresh store,
and an API client wired to all three."""

import json
from collections.abc import Iterator
from datetime import date
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.dependencies import get_daily_service, get_training_service
from app.main import app
from app.models.daily import DailyPuzzle
from app.models.level import Level
from app.models.puzzle import Clue
from app.services import daily_puzzles
from app.services.daily_puzzles import DailyPuzzleBook
from app.services.daily_service import DailyService
from app.services.run_store import RunStore
from app.services.training_service import TrainingService, new_training_store
from tests.factories import LAUNCH_DAY, FakeClock, make_puzzle, make_record

# Every test level is the same tiny board: cameras at 0, 1 and 2, so clearing them loses and
# clearing the other cells files the record. Levels III and IV carry a false Party record on 5.
TEST_LAYOUT = ["CCC..", "....."]
TEST_CAMERAS = (0, 1, 2)


def fake_build(level: Level, day: date, salt: str) -> DailyPuzzle:
    lies = level.lies
    clue = Clue(5, 2, liar=True) if lies else 5
    return make_record(make_puzzle(TEST_LAYOUT, clues=[clue], lies=lies), day=day, level=level.id)


@pytest.fixture
def fake_records(monkeypatch: pytest.MonkeyPatch) -> None:
    """Make the record book build tiny hand-drawn records instead of generating real ones."""
    monkeypatch.setattr(daily_puzzles, "build_daily_puzzle", fake_build)


@pytest.fixture
def clock() -> FakeClock:
    return FakeClock()


@pytest.fixture
def store() -> RunStore:
    return RunStore(capacity=50)


@pytest.fixture
def service(fake_records: None, store: RunStore, clock: FakeClock) -> DailyService:
    return DailyService(store, DailyPuzzleBook(salt="x" * 16), launch_day=LAUNCH_DAY, clock=clock)


@pytest.fixture
def settings() -> Settings:
    """Explicit settings for the API, so tests never depend on a developer's backend/.env (and
    never reach a real Supabase project)."""
    return Settings(
        dev_mode=False,
        cookie_secure=False,
        supabase_url=None,
        supabase_secret_key=None,
        standing_min_players=3,
    )


@pytest.fixture
def training_service(clock: FakeClock) -> TrainingService:
    return TrainingService(new_training_store(capacity=50), clock=clock)


@pytest.fixture
def client(
    service: DailyService, training_service: TrainingService, settings: Settings
) -> Iterator[TestClient]:
    """The real app, with the daily service swapped for one on fake records and a fake clock, and
    a fresh training store."""
    app.dependency_overrides[get_daily_service] = lambda: service
    app.dependency_overrides[get_training_service] = lambda: training_service
    app.dependency_overrides[get_settings] = lambda: settings
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def js_engine() -> dict[str, Any]:
    """Records and RNG output from the original JavaScript engine, for parity checks."""
    return json.loads((Path(__file__).parent / "fixtures" / "js_engine_records.json").read_text())
