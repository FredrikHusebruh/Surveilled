"""Builds the open days' records in the background, so no player waits for a level IV record."""

import logging
from collections.abc import Callable
from datetime import date
from threading import Event, Thread

from app.models.daily import LEVEL_COUNT
from app.services.daily_puzzles import DailyPuzzleBook

logger = logging.getLogger("surveilled.warmer")


class PuzzleWarmer:
    """A daemon thread that warms `open_days()` every `interval_seconds`, nearest days first."""

    def __init__(
        self,
        book: DailyPuzzleBook,
        open_days: Callable[[], list[date]],
        interval_seconds: float = 600,
    ) -> None:
        self._book = book
        self._open_days = open_days
        self._interval = interval_seconds
        self._stop = Event()
        self._thread = Thread(target=self._loop, name="puzzle-warmer", daemon=True)

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._thread.join(timeout=5)

    def warm_once(self) -> None:
        days = self._open_days()
        if not days:
            return
        self._book.forget_before(days[0])
        middle = days[len(days) // 2]
        for day in sorted(days, key=lambda d: abs((d - middle).days)):
            for level in range(1, LEVEL_COUNT + 1):
                if self._stop.is_set():
                    return
                self._book.get(day, level)

    def _loop(self) -> None:
        while not self._stop.is_set():
            try:
                self.warm_once()
            except Exception:
                # A failed warm-up must not kill the thread: the record is built on demand
                # instead, and the failure is logged with its traceback for investigation.
                logger.exception("Warming the daily records failed.")
            self._stop.wait(self._interval)
