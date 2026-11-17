from datetime import date, timedelta

import pytest

from app.models.daily import DailyPuzzle
from app.models.level import Level
from app.services import daily_puzzles
from app.services.daily_puzzles import DailyPuzzleBook
from app.services.puzzle_warmer import PuzzleWarmer
from tests.conftest import fake_build
from tests.factories import TODAY

OPEN_DAYS = [TODAY - timedelta(days=1), TODAY, TODAY + timedelta(days=1)]


def test_warming_builds_every_open_record_nearest_day_first(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    built: list[tuple[date, int]] = []

    def recording_build(level: Level, day: date, salt: str) -> DailyPuzzle:
        built.append((day, level.id))
        return fake_build(level, day, salt)

    monkeypatch.setattr(daily_puzzles, "build_daily_puzzle", recording_build)
    book = DailyPuzzleBook("x" * 16)
    stale = book.get(TODAY - timedelta(days=5), 1)

    PuzzleWarmer(book, lambda: OPEN_DAYS).warm_once()

    warmed = built[1:]
    assert len(warmed) == 12
    assert warmed[:4] == [(TODAY, level) for level in range(1, 5)]
    assert {day for day, _ in warmed} == set(OPEN_DAYS)
    assert book.get(TODAY - timedelta(days=5), 1) is not stale
