from datetime import timedelta

import pytest

from app.models.daily import DailyRun
from app.services.run_store import RunStore
from tests.factories import TODAY, make_game, make_puzzle

GAME = make_game(make_puzzle(["C.."]))


def _start(run: DailyRun) -> tuple[DailyRun, str]:
    return run.with_game(1, GAME), "started"


def test_an_unknown_player_gets_an_untouched_run() -> None:
    run = RunStore(capacity=5).get("p", TODAY)

    assert run == DailyRun(player_id="p", day=TODAY)


def test_update_stores_the_transition_result_per_player_and_day() -> None:
    store = RunStore(capacity=5)

    run, result = store.update("p", TODAY, _start)

    assert result == "started"
    assert store.get("p", TODAY) == run
    assert store.get("p", TODAY + timedelta(days=1)).game(1) is None
    assert store.get("q", TODAY).game(1) is None


def test_a_failed_transition_changes_nothing() -> None:
    store = RunStore(capacity=5)
    store.update("p", TODAY, _start)

    def explode(run: DailyRun) -> tuple[DailyRun, None]:
        raise ValueError("refused")

    with pytest.raises(ValueError, match="refused"):
        store.update("p", TODAY, explode)
    assert store.get("p", TODAY).game(1) is GAME


def test_least_recently_used_run_is_evicted_past_capacity() -> None:
    store = RunStore(capacity=2)
    for player in ("a", "b"):
        store.update(player, TODAY, _start)
    store.get("a", TODAY)
    store.update("c", TODAY, _start)

    assert store.get("a", TODAY).game(1) is GAME
    assert store.get("c", TODAY).game(1) is GAME
    assert store.get("b", TODAY).game(1) is None
