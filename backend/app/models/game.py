"""A record in play: the puzzle plus everything the player has done to it."""

from dataclasses import dataclass
from enum import StrEnum

from app.models.puzzle import Puzzle

MAX_STRIKES = 3


class GameStatus(StrEnum):
    PLAY = "play"
    WON = "won"
    LOST = "lost"


class ClearOutcome(StrEnum):
    """What clearing a cell did.

    `cascade` means the cell was a zero, so everything it sees was cleared too.
    """

    CLEARED = "cleared"
    CASCADE = "cascade"
    SEEN = "seen"


@dataclass(frozen=True)
class Game:
    """Server-side state of one record. Never sent as is: it holds the camera positions.

    `marks` and `stamps` are the player's notes. `exposed` holds cameras the player cleared by
    mistake; each one is a strike, and strikes never carry over to another record.
    """

    puzzle: Puzzle
    rating: int
    started_at: float
    cleared: frozenset[int] = frozenset()
    marks: frozenset[int] = frozenset()
    stamps: frozenset[int] = frozenset()
    exposed: frozenset[int] = frozenset()
    hints: int = 0
    status: GameStatus = GameStatus.PLAY
    finished_at: float | None = None

    @property
    def strikes(self) -> int:
        return len(self.exposed)

    def elapsed_seconds(self, now: float) -> int:
        """Whole seconds since the record started, frozen once it is filed or lost."""
        end = self.finished_at if self.finished_at is not None else now
        return max(0, int(end - self.started_at))
