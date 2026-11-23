"""Training use cases: deal a training record and play it with the real rules.

Training games are practice: they live in memory per (player, level), never count towards the
day, are never logged and never ranked. Hints are free. Three strikes still lose the record, and
the player starts it again.
"""

import time
from collections.abc import Callable

from app.models.game import ClearOutcome, Game, OpenOutcome
from app.models.hint import Hint, HintKind
from app.services import game_rules
from app.services.errors import InvalidMoveError
from app.services.lru_store import LruStore
from app.services.training_records import training_record

type TrainingKey = tuple[str, int]
type TrainingStore = LruStore[TrainingKey, Game | None]


def new_training_store(capacity: int) -> TrainingStore:
    """An empty store of training games: a player who hasn't started a training has none."""
    return LruStore(capacity, _no_game)


class TrainingService:
    """Plays training records for a player. `clock` returns epoch seconds and is injectable."""

    def __init__(self, store: TrainingStore, clock: Callable[[], float] = time.time) -> None:
        self._store = store
        self._clock = clock

    def now(self) -> float:
        return self._clock()

    def start(self, player_id: str, level: int) -> Game:
        """Deal a fresh game of `level`'s training record, replacing any earlier one."""
        record = training_record(level)
        fresh = Game(puzzle=record.puzzle, rating=record.rating, started_at=self._clock())
        self._store.update((player_id, level), lambda _: (fresh, None))
        return fresh

    def clear(self, player_id: str, level: int, cell: int) -> tuple[Game, ClearOutcome]:
        return self._play(
            player_id, level, lambda game: game_rules.clear_cell(game, cell, self._clock())
        )

    def mark(self, player_id: str, level: int, cell: int) -> Game:
        game, _ = self._play(
            player_id, level, lambda game: (game_rules.toggle_mark(game, cell), None)
        )
        return game

    def stamp(self, player_id: str, level: int, cell: int) -> Game:
        game, _ = self._play(
            player_id, level, lambda game: (game_rules.toggle_stamp(game, cell), None)
        )
        return game

    def hint(self, player_id: str, level: int, kind: HintKind) -> tuple[Game, Hint]:
        """Show where a camera or a safe cell is. Unlike the day's records, hints here are
        unlimited."""
        return self._play(player_id, level, lambda game: game_rules.take_hint(game, kind))

    def open(self, player_id: str, level: int, cell: int) -> tuple[Game, OpenOutcome]:
        """The Open hint: open the chosen cell, marking it if it is a camera. Unlimited here."""
        return self._play(
            player_id, level, lambda game: game_rules.open_cell(game, cell, self._clock())
        )

    def _play[T](
        self, player_id: str, level: int, move: Callable[[Game], tuple[Game, T]]
    ) -> tuple[Game, T]:
        """Apply `move` to the player's training game of `level` under the store's lock."""
        training_record(level)

        def transition(game: Game | None) -> tuple[Game | None, tuple[Game, T]]:
            if game is None:
                raise InvalidMoveError("Start the training first.")
            updated, result = move(game)
            return updated, (updated, result)

        _, played = self._store.update((player_id, level), transition)
        return played


def _no_game(_: TrainingKey) -> Game | None:
    return None
