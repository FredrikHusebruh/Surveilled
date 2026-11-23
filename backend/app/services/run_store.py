"""In-memory storage of daily runs. A restart forgets every run."""

from collections.abc import Callable
from datetime import date

from app.models.daily import DailyRun
from app.services.lru_store import LruStore

type RunKey = tuple[str, date]


class RunStore:
    """Thread-safe store of each player's run per day, evicting the least recently used past
    `capacity`.

    `update` runs a transition under the store's lock, so two requests on the same run can't
    interleave. The lock is global, so keep slow work (building records) out of transitions.
    """

    def __init__(self, capacity: int) -> None:
        self._runs: LruStore[RunKey, DailyRun] = LruStore(capacity, _untouched_run)

    def get(self, player_id: str, day: date) -> DailyRun:
        """The player's run for `day`; an untouched run if they haven't played yet."""
        return self._runs.get((player_id, day))

    def update[T](
        self, player_id: str, day: date, transition: Callable[[DailyRun], tuple[DailyRun, T]]
    ) -> tuple[DailyRun, T]:
        """Apply `transition` atomically and store its new run. If it raises, nothing changes."""
        return self._runs.update((player_id, day), transition)


def _untouched_run(key: RunKey) -> DailyRun:
    player_id, day = key
    return DailyRun(player_id=player_id, day=day)
