"""The daily game: four records per day, played in order, one attempt each."""

from dataclasses import dataclass, replace
from datetime import date
from enum import StrEnum

from app.models.game import Game, GameStatus
from app.models.grade import Grade
from app.models.hint import HintKind
from app.models.puzzle import Puzzle

LEVEL_COUNT = 4


@dataclass(frozen=True)
class DailyPuzzle:
    """Level `level`'s record for `day`. The same for every player."""

    day: date
    level: int
    puzzle: Puzzle
    grade: Grade


class LevelState(StrEnum):
    LOCKED = "locked"
    OPEN = "open"
    PLAYING = "playing"
    FILED = "filed"
    SEEN = "seen"


class RunOutcome(StrEnum):
    PLAYING = "playing"
    TOPPLED = "toppled"
    OUT = "out"


@dataclass(frozen=True)
class DailyRun:
    """One player's day. `games[i]` is level i+1's game, or None until it is opened.

    A level opens once the one before it is filed (or at once, out of order, in dev mode). Being
    seen on any level ends the day: the player is out until tomorrow. Filing every level topples
    the government.
    """

    player_id: str
    day: date
    games: tuple[Game | None, ...] = (None,) * LEVEL_COUNT

    def game(self, level: int) -> Game | None:
        return self.games[level - 1]

    def with_game(self, level: int, game: Game) -> "DailyRun":
        games = tuple(game if i == level - 1 else g for i, g in enumerate(self.games))
        return replace(self, games=games)

    @property
    def outcome(self) -> RunOutcome:
        statuses = [g.status for g in self.games if g is not None]
        if GameStatus.LOST in statuses:
            return RunOutcome.OUT
        if all(g is not None and g.status is GameStatus.WON for g in self.games):
            return RunOutcome.TOPPLED
        return RunOutcome.PLAYING

    @property
    def hints_available(self) -> tuple[HintKind, ...]:
        """The kinds of hint the player may still take today: one of each a day, shared by every
        level."""
        used = {kind for game in self.games if game is not None for kind in game.hints_used}
        return tuple(kind for kind in HintKind if kind not in used)

    def state(self, level: int, *, in_order: bool = True) -> LevelState:
        """Where `level` stands. With `in_order` off (dev mode only) a level need not wait for the
        one before it, though being seen still closes the day."""
        game = self.game(level)
        if game is not None:
            return {
                GameStatus.PLAY: LevelState.PLAYING,
                GameStatus.WON: LevelState.FILED,
                GameStatus.LOST: LevelState.SEEN,
            }[game.status]
        previous = self.game(level - 1) if level > 1 else None
        unlocked = (
            not in_order
            or level == 1
            or (previous is not None and previous.status is GameStatus.WON)
        )
        if unlocked and self.outcome is RunOutcome.PLAYING:
            return LevelState.OPEN
        return LevelState.LOCKED
