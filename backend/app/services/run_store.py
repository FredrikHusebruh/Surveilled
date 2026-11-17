"""In-memory storage of daily runs. A restart forgets every run."""

from collections import OrderedDict
from collections.abc import Callable
from datetime import date
from threading import Lock

from app.models.daily import DailyRun

type RunKey = tuple[str, date]


class RunStore:
    """Thread-safe store of each player's run per day, evicting the least recently used past
    `capacity`.

    `update` runs a transition under the store's lock, so two requests on the same run can't
    interleave. The lock is global, so keep slow work (building records) out of transitions.
    """

    def __init__(self, capacity: int) -> None:
        self._capacity = capacity
        self._runs: OrderedDict[RunKey, DailyRun] = OrderedDict()
        self._lock = Lock()

    def get(self, player_id: str, day: date) -> DailyRun:
        """The player's run for `day`; an untouched run if they haven't played yet."""
        with self._lock:
            return self._touch(player_id, day)

    def update[T](
        self, player_id: str, day: date, transition: Callable[[DailyRun], tuple[DailyRun, T]]
    ) -> tuple[DailyRun, T]:
        """Apply `transition` atomically and store its new run. If it raises, nothing changes."""
        with self._lock:
            updated, result = transition(self._touch(player_id, day))
            self._runs[(player_id, day)] = updated
            self._runs.move_to_end((player_id, day))
            while len(self._runs) > self._capacity:
                self._runs.popitem(last=False)
            return updated, result

    def _touch(self, player_id: str, day: date) -> DailyRun:
        key = (player_id, day)
        run = self._runs.get(key)
        if run is None:
            return DailyRun(player_id=player_id, day=day)
        self._runs.move_to_end(key)
        return run
