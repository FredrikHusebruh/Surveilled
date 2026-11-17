import pytest

from app.models.daily import DailyRun
from app.models.game import GameStatus
from app.services.scoring import (
    HINT_PENALTY_SECONDS,
    STRIKE_PENALTY_SECONDS,
    day_score,
    level_score,
)
from tests.conftest import TEST_LAYOUT
from tests.factories import START_TIME, TODAY, make_game, make_puzzle

PUZZLE = make_puzzle(TEST_LAYOUT)


def test_a_level_scores_its_time_plus_a_penalty_per_hint_and_per_strike() -> None:
    game = make_game(
        PUZZLE, hints=2, exposed=frozenset({0}), status=GameStatus.WON, finished_at=START_TIME + 300
    )

    score = level_score(1, game)

    assert score.filed
    assert score.seconds == 300
    assert score.hint_penalty_seconds == 2 * HINT_PENALTY_SECONDS
    assert score.strike_penalty_seconds == STRIKE_PENALTY_SECONDS
    assert score.total_seconds == 300 + 2 * HINT_PENALTY_SECONDS + STRIKE_PENALTY_SECONDS


def test_a_record_in_play_has_no_score() -> None:
    with pytest.raises(ValueError, match="still in play"):
        level_score(1, make_game(PUZZLE))


def test_a_day_ended_by_being_seen_counts_every_level_played() -> None:
    filed = make_game(PUZZLE, status=GameStatus.WON, finished_at=START_TIME + 100)
    seen = make_game(
        PUZZLE, exposed=frozenset({0, 1, 2}), status=GameStatus.LOST, finished_at=START_TIME + 40
    )
    run = DailyRun(player_id="p", day=TODAY, games=(filed, seen, None, None))

    score = day_score(run)

    assert score.levels_filed == 1
    assert [level.level for level in score.levels] == [1, 2]
    assert score.total_seconds == 100 + 40 + 3 * STRIKE_PENALTY_SECONDS


def test_a_day_still_in_play_has_no_score() -> None:
    run = DailyRun(player_id="p", day=TODAY, games=(make_game(PUZZLE), None, None, None))

    with pytest.raises(ValueError, match="still being played"):
        day_score(run)
