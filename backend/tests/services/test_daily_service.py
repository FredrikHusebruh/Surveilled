import logging
from datetime import UTC, datetime, timedelta

import pytest

from app.models.daily import DailyRun, LevelState, RunOutcome
from app.models.game import ClearOutcome, GameStatus
from app.models.hint import HintKind
from app.services.daily_puzzles import DailyPuzzleBook
from app.services.daily_service import DailyService
from app.services.errors import (
    DayNotOpenError,
    HintsSpentError,
    InvalidMoveError,
    UnknownLevelError,
)
from app.services.run_store import RunStore
from tests.conftest import TEST_CAMERAS
from tests.factories import LAUNCH_DAY, TODAY, FakeClock

PLAYER = "a" * 32
# A safe hidden cell on the test board: marking it gives a wrong-mark hint.
WRONG_MARK = 3


def _file(service: DailyService, level: int, player: str = PLAYER) -> DailyRun:
    """Clear every safe hidden cell of the test board until the level is filed."""
    run = service.start(player, TODAY, level)
    for cell in range(10):
        game = run.game(level)
        assert game is not None
        hidden = cell not in game.cleared and game.puzzle.clue_at(cell) is None
        if game.status is GameStatus.PLAY and cell not in TEST_CAMERAS and hidden:
            run, _ = service.clear(player, TODAY, level, cell)
    return run


def _lose(service: DailyService, level: int) -> DailyRun:
    service.start(PLAYER, TODAY, level)
    run = service.run(PLAYER, TODAY)
    for camera in TEST_CAMERAS:
        run, outcome = service.clear(PLAYER, TODAY, level, camera)
        assert outcome is ClearOutcome.SEEN
    return run


def test_open_days_span_one_day_either_side_of_utc(service: DailyService) -> None:
    assert service.open_days() == [TODAY - timedelta(days=1), TODAY, TODAY + timedelta(days=1)]


def test_nothing_before_launch_is_open(fake_records: None) -> None:
    launch_noon = FakeClock(datetime(2026, 11, 16, 12, tzinfo=UTC).timestamp())
    service = DailyService(
        RunStore(10), DailyPuzzleBook("x" * 16), launch_day=LAUNCH_DAY, clock=launch_noon
    )

    assert service.open_days() == [LAUNCH_DAY, LAUNCH_DAY + timedelta(days=1)]
    assert service.day_number(LAUNCH_DAY) == 1


def test_closed_days_are_refused(service: DailyService) -> None:
    with pytest.raises(DayNotOpenError):
        service.run(PLAYER, TODAY + timedelta(days=2))
    with pytest.raises(DayNotOpenError):
        service.start(PLAYER, TODAY - timedelta(days=2), 1)


def test_levels_open_in_order(service: DailyService) -> None:
    with pytest.raises(InvalidMoveError, match="previous"):
        service.start(PLAYER, TODAY, 2)

    run = _file(service, 1)

    assert run.state(1) is LevelState.FILED
    assert run.state(2) is LevelState.OPEN


def test_dev_mode_opens_any_level_out_of_order(
    fake_records: None, store: RunStore, clock: FakeClock
) -> None:
    dev = DailyService(
        store, DailyPuzzleBook("x" * 16), launch_day=LAUNCH_DAY, clock=clock, levels_in_order=False
    )

    run = dev.start(PLAYER, TODAY, 3)

    assert run.state(3) is LevelState.PLAYING
    assert [run.state(level, in_order=False) for level in (1, 2, 4)] == [LevelState.OPEN] * 3
    assert run.state(2) is LevelState.LOCKED


def test_filing_only_the_last_level_does_not_topple(
    fake_records: None, store: RunStore, clock: FakeClock
) -> None:
    dev = DailyService(
        store, DailyPuzzleBook("x" * 16), launch_day=LAUNCH_DAY, clock=clock, levels_in_order=False
    )

    run = _file(dev, 4)

    assert run.state(4) is LevelState.FILED
    assert run.outcome is RunOutcome.PLAYING


def test_starting_twice_keeps_the_first_clock(service: DailyService, clock: FakeClock) -> None:
    first = service.start(PLAYER, TODAY, 1)
    clock.advance(60)

    second = service.start(PLAYER, TODAY, 1)

    assert second.game(1) == first.game(1)


def test_moves_need_an_opened_level(service: DailyService) -> None:
    with pytest.raises(InvalidMoveError, match="not been opened"):
        service.clear(PLAYER, TODAY, 1, 3)
    with pytest.raises(UnknownLevelError):
        service.start(PLAYER, TODAY, 9)


def test_three_strikes_end_the_day(service: DailyService) -> None:
    run = _lose(service, 1)

    assert run.outcome is RunOutcome.OUT
    assert run.state(2) is LevelState.LOCKED
    with pytest.raises(InvalidMoveError, match="seen today"):
        service.start(PLAYER, TODAY, 2)


def test_strikes_reset_on_each_level(service: DailyService) -> None:
    service.start(PLAYER, TODAY, 1)
    service.clear(PLAYER, TODAY, 1, TEST_CAMERAS[0])
    _file(service, 1)

    run = service.start(PLAYER, TODAY, 2)

    level_two = run.game(2)
    assert level_two is not None
    assert level_two.strikes == 0


def test_filing_all_four_levels_topples_the_government(service: DailyService) -> None:
    runs = [_file(service, level) for level in range(1, 5)]

    assert [r.outcome for r in runs] == [RunOutcome.PLAYING] * 3 + [RunOutcome.TOPPLED]


def test_players_have_separate_days(service: DailyService) -> None:
    _lose(service, 1)

    other = service.run("b" * 32, TODAY)

    assert other.outcome is RunOutcome.PLAYING
    assert other.state(1) is LevelState.OPEN


def test_each_closed_record_is_logged_once(
    service: DailyService, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.INFO, logger="surveilled.results"):
        _file(service, 1)

    lines = [r.getMessage() for r in caplog.records if r.name == "surveilled.results"]
    assert len(lines) == 1
    assert "level=1" in lines[0]
    assert "status=won" in lines[0]
    assert PLAYER not in lines[0]


def test_reset_forgets_the_day_for_that_player_only(service: DailyService) -> None:
    _lose(service, 1)
    service.start("b" * 32, TODAY, 1)

    run = service.reset(PLAYER, TODAY)

    assert run.outcome is RunOutcome.PLAYING
    assert run.state(1) is LevelState.OPEN
    assert service.run("b" * 32, TODAY).state(1) is LevelState.PLAYING


def test_a_player_gets_one_hint_of_each_kind_a_day_across_levels(service: DailyService) -> None:
    service.start(PLAYER, TODAY, 1)
    service.hint(PLAYER, TODAY, 1, HintKind.CAMERA)
    run, _ = service.open(PLAYER, TODAY, 1, 6)
    assert run.hints_available == (HintKind.SAFE,)
    _file(service, 1)
    service.start(PLAYER, TODAY, 2)

    with pytest.raises(HintsSpentError, match="Camera"):
        service.hint(PLAYER, TODAY, 2, HintKind.CAMERA)
    with pytest.raises(HintsSpentError, match="Open"):
        service.open(PLAYER, TODAY, 2, 6)
    run, _ = service.hint(PLAYER, TODAY, 2, HintKind.SAFE)

    assert run.hints_available == ()
    game = run.game(2)
    assert game is not None
    assert game.hints_used == (HintKind.SAFE,)


def test_open_marks_a_camera_on_the_days_record(service: DailyService) -> None:
    service.start(PLAYER, TODAY, 1)

    run, outcome = service.open(PLAYER, TODAY, 1, TEST_CAMERAS[0])

    game = run.game(1)
    assert game is not None
    assert game.marks == {TEST_CAMERAS[0]}
    assert game.strikes == 0
    assert outcome.value == "marked"


def test_hints_belong_to_each_player(service: DailyService) -> None:
    service.start(PLAYER, TODAY, 1)
    for kind in (HintKind.CAMERA, HintKind.SAFE):
        service.hint(PLAYER, TODAY, 1, kind)

    other = "b" * 32
    run = service.start(other, TODAY, 1)

    assert run.hints_available == tuple(HintKind)
