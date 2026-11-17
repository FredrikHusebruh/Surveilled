from datetime import date, timedelta
from threading import Thread

import pytest

from app.models.daily import DailyPuzzle
from app.models.level import Level
from app.services import daily_puzzles
from app.services.daily_puzzles import DailyPuzzleBook, build_daily_puzzle, daily_seed
from app.services.game_rules import new_game
from app.services.levels import LEVELS
from tests.factories import START_TIME, TODAY
from tests.playthrough import play_by_hints

SALT = "test-salt-0123456789"
# A day whose real records build quickly, so these tests stay fast.
SAMPLE_DAY = date(2026, 11, 20)


@pytest.fixture(scope="module")
def sample_day() -> list[DailyPuzzle]:
    return [build_daily_puzzle(level, SAMPLE_DAY, SALT) for level in LEVELS]


def test_daily_seed_depends_on_salt_day_and_level() -> None:
    base = daily_seed(SALT, TODAY, 1)

    assert daily_seed(SALT, TODAY, 1) == base
    assert daily_seed("another-salt-000000", TODAY, 1) != base
    assert daily_seed(SALT, TODAY + timedelta(days=1), 1) != base
    assert daily_seed(SALT, TODAY, 2) != base


def test_each_level_lands_in_its_band_and_ranges(sample_day: list[DailyPuzzle]) -> None:
    for level, record in zip(LEVELS, sample_day, strict=True):
        board = record.puzzle.board
        assert record.level == level.id
        assert level.band.admits(record.grade)
        assert (board.rows, board.cols) in level.sizes
        assert sum(board.walls) in level.walls
        assert board.camera_count in level.cameras
        assert board.lies is level.lies


def test_the_day_gets_strictly_harder(sample_day: list[DailyPuzzle]) -> None:
    ratings = [record.grade.rating for record in sample_day]
    assert ratings == sorted(set(ratings))


def test_daily_records_can_be_filed_by_hints_alone(sample_day: list[DailyPuzzle]) -> None:
    for record in sample_day:
        final = play_by_hints(new_game(record, START_TIME))
        assert final.strikes == 0


def test_building_is_deterministic(sample_day: list[DailyPuzzle]) -> None:
    assert build_daily_puzzle(LEVELS[0], SAMPLE_DAY, SALT) == sample_day[0]


def test_the_book_builds_each_record_once_even_under_concurrency(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    built: list[tuple[date, int]] = []
    real_build = daily_puzzles.build_daily_puzzle

    def counting_build(level: Level, day: date, salt: str) -> DailyPuzzle:
        built.append((day, level.id))
        return real_build(level, day, salt)

    monkeypatch.setattr(daily_puzzles, "build_daily_puzzle", counting_build)
    book = DailyPuzzleBook(SALT)
    results: list[DailyPuzzle] = []
    threads = [Thread(target=lambda: results.append(book.get(SAMPLE_DAY, 1))) for _ in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert built == [(SAMPLE_DAY, 1)]
    assert all(result is results[0] for result in results)


def test_forget_before_drops_only_older_days(fake_records: None) -> None:
    book = DailyPuzzleBook(SALT)
    old = book.get(TODAY - timedelta(days=2), 1)
    current = book.get(TODAY, 1)

    book.forget_before(TODAY)

    assert book.get(TODAY, 1) is current
    assert book.get(TODAY - timedelta(days=2), 1) is not old
