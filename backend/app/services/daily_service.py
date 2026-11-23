"""Daily game use cases: look at a day, open its levels in order, and play them.

Every move is addressed by (player, day, level). A player has at most one game per level per day,
so there are no game ids to guess or trust.
"""

import time
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta

from app.models.daily import DailyRun, LevelState, RunOutcome
from app.models.game import ClearOutcome, Game, GameStatus, OpenOutcome
from app.models.hint import Hint, HintKind
from app.services import game_rules
from app.services.daily_puzzles import DailyPuzzleBook
from app.services.errors import DayNotOpenError, HintsSpentError, InvalidMoveError
from app.services.levels import get_level
from app.services.results_log import log_record_closed
from app.services.run_store import RunStore

# Players get a new day at their own local midnight. Time zones span UTC-12 to UTC+14, so at any
# moment the local date somewhere is within one day of the UTC date.
_OPEN_DAYS_AROUND_UTC = 1


class DailyService:
    """Coordinates the daily records, the rules and run storage.

    `clock` returns epoch seconds and is injectable for tests; it also decides what "today" is.
    `levels_in_order` is off only in dev mode, so a developer can open any level straight away.
    """

    def __init__(
        self,
        store: RunStore,
        book: DailyPuzzleBook,
        launch_day: date,
        clock: Callable[[], float] = time.time,
        *,
        levels_in_order: bool = True,
    ) -> None:
        self._store = store
        self._book = book
        self._launch_day = launch_day
        self._clock = clock
        self.levels_in_order = levels_in_order

    def now(self) -> float:
        return self._clock()

    def day_number(self, day: date) -> int:
        """Day 1 is the launch day."""
        return (day - self._launch_day).days + 1

    def open_days(self) -> list[date]:
        """Days some player somewhere can be on right now, oldest first."""
        utc_today = datetime.fromtimestamp(self.now(), UTC).date()
        days = [
            utc_today + timedelta(days=offset)
            for offset in range(-_OPEN_DAYS_AROUND_UTC, _OPEN_DAYS_AROUND_UTC + 1)
        ]
        return [d for d in days if d >= self._launch_day]

    def run(self, player_id: str, day: date) -> DailyRun:
        self._require_open(day)
        return self._store.get(player_id, day)

    def start(self, player_id: str, day: date, level: int) -> DailyRun:
        """Open `level`. Starting a level that is already open changes nothing."""
        self._require_open(day)
        get_level(level)
        current = self._store.get(player_id, day)
        if self._state(current, level) is not LevelState.OPEN:
            return self._require_state_allows_start(current, level)
        # Build (or fetch) the record before taking the store's lock: building can take seconds.
        record = self._book.get(day, level)

        def transition(run: DailyRun) -> tuple[DailyRun, None]:
            if self._state(run, level) is not LevelState.OPEN:
                return self._require_state_allows_start(run, level), None
            return run.with_game(level, game_rules.new_game(record, self.now())), None

        run, _ = self._store.update(player_id, day, transition)
        return run

    def reset(self, player_id: str, day: date) -> DailyRun:
        """Forget the player's progress on `day`, lock-out included. A developer tool: the router
        only exposes it in dev mode."""
        self._require_open(day)
        fresh = DailyRun(player_id=player_id, day=day)
        run, _ = self._store.update(player_id, day, lambda _: (fresh, None))
        return run

    def clear(
        self, player_id: str, day: date, level: int, cell: int
    ) -> tuple[DailyRun, ClearOutcome]:
        return self._play(
            player_id, day, level, lambda game: game_rules.clear_cell(game, cell, self.now())
        )

    def mark(self, player_id: str, day: date, level: int, cell: int) -> DailyRun:
        run, _ = self._play(
            player_id, day, level, lambda game: (game_rules.toggle_mark(game, cell), None)
        )
        return run

    def stamp(self, player_id: str, day: date, level: int, cell: int) -> DailyRun:
        run, _ = self._play(
            player_id, day, level, lambda game: (game_rules.toggle_stamp(game, cell), None)
        )
        return run

    def hint(self, player_id: str, day: date, level: int, kind: HintKind) -> tuple[DailyRun, Hint]:
        """Show where a camera or a safe cell is on `level`. Raises HintsSpentError once that kind
        was used today, on any level: the player gets one of each a day."""

        def move(run: DailyRun, game: Game) -> tuple[Game, Hint]:
            self._require_hint_left(run, game, kind)
            return game_rules.take_hint(game, kind)

        return self._play_in_run(player_id, day, level, move)

    def open(
        self, player_id: str, day: date, level: int, cell: int
    ) -> tuple[DailyRun, OpenOutcome]:
        """The Open hint on `level`: open the chosen cell, marking it if it is a camera. One a day,
        across all levels."""

        def move(run: DailyRun, game: Game) -> tuple[Game, OpenOutcome]:
            self._require_hint_left(run, game, HintKind.OPEN)
            return game_rules.open_cell(game, cell, self.now())

        return self._play_in_run(player_id, day, level, move)

    @staticmethod
    def _require_hint_left(run: DailyRun, game: Game, kind: HintKind) -> None:
        if game.status is GameStatus.PLAY and kind not in run.hints_available:
            raise HintsSpentError(kind)

    def _play[T](
        self,
        player_id: str,
        day: date,
        level: int,
        move: Callable[[Game], tuple[Game, T]],
    ) -> tuple[DailyRun, T]:
        return self._play_in_run(player_id, day, level, lambda _, game: move(game))

    def _play_in_run[T](
        self,
        player_id: str,
        day: date,
        level: int,
        move: Callable[[DailyRun, Game], tuple[Game, T]],
    ) -> tuple[DailyRun, T]:
        """Apply `move` to the level's game under the store's lock. `move` also sees the whole run,
        for rules that span the day."""
        self._require_open(day)
        get_level(level)

        def transition(run: DailyRun) -> tuple[DailyRun, T]:
            game = run.game(level)
            if game is None:
                raise InvalidMoveError("That record has not been opened.")
            updated, result = move(run, game)
            if game.status is GameStatus.PLAY and updated.status is not GameStatus.PLAY:
                log_record_closed(day, level, updated)
            return run.with_game(level, updated), result

        return self._store.update(player_id, day, transition)

    def _state(self, run: DailyRun, level: int) -> LevelState:
        return run.state(level, in_order=self.levels_in_order)

    def _require_open(self, day: date) -> None:
        if day not in self.open_days():
            raise DayNotOpenError()

    @staticmethod
    def _require_state_allows_start(run: DailyRun, level: int) -> DailyRun:
        """Starting an already-started level is a no-op; starting a closed-off one is refused."""
        state = run.state(level)
        if state in (LevelState.PLAYING, LevelState.FILED, LevelState.SEEN):
            return run
        if run.outcome is RunOutcome.OUT:
            raise InvalidMoveError("You were seen today. The records reopen tomorrow.")
        raise InvalidMoveError("File the previous record first.")
