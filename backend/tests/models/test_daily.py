from dataclasses import replace

from app.models.daily import DailyRun, LevelState, RunOutcome
from app.models.game import Game, GameStatus
from tests.factories import TODAY, make_game, make_puzzle

PUZZLE = make_puzzle(["C.."])
PLAYING = make_game(PUZZLE)
WON = replace(PLAYING, status=GameStatus.WON)
LOST = replace(PLAYING, status=GameStatus.LOST)


def _run(*games: Game) -> DailyRun:
    run = DailyRun(player_id="p", day=TODAY)
    for level, game in enumerate(games, start=1):
        run = run.with_game(level, game)
    return run


def test_a_fresh_day_opens_only_the_first_level() -> None:
    run = _run()

    assert [run.state(level) for level in range(1, 5)] == [
        LevelState.OPEN,
        LevelState.LOCKED,
        LevelState.LOCKED,
        LevelState.LOCKED,
    ]
    assert run.outcome is RunOutcome.PLAYING


def test_filing_a_level_opens_the_next() -> None:
    run = _run(WON, PLAYING)

    assert [run.state(level) for level in range(1, 5)] == [
        LevelState.FILED,
        LevelState.PLAYING,
        LevelState.LOCKED,
        LevelState.LOCKED,
    ]


def test_being_seen_closes_the_rest_of_the_day() -> None:
    run = _run(WON, LOST)

    assert run.outcome is RunOutcome.OUT
    assert run.state(2) is LevelState.SEEN
    assert run.state(3) is LevelState.LOCKED


def test_filing_the_last_level_topples_the_government() -> None:
    assert _run(WON, WON, WON, WON).outcome is RunOutcome.TOPPLED


def test_with_game_returns_a_new_run() -> None:
    run = _run()

    updated = run.with_game(1, PLAYING)

    assert run.game(1) is None
    assert updated.game(1) is PLAYING
