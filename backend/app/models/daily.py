"""The daily game: four records per day, played in order, one attempt each."""

from dataclasses import dataclass, replace
from datetime import date
from enum import StrEnum

from app.models.game import Game, GameStatus
from app.models.grade import Grade
from app.models.puzzle import Puzzle

LEVEL_COUNT = 4

# Hints a player may take across the whole day, all four levels together.
DAILY_HINTS = 3


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

    A level opens once the one before it is filed. Being seen on any level ends the day: the
    player is out until tomorrow. Filing the last level topples the government.
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
        last = self.games[-1]
        if last is not None and last.status is GameStatus.WON:
            return RunOutcome.TOPPLED
        return RunOutcome.PLAYING

    @property
    def hints_left(self) -> int:
        """Hints the player may still take today. The allowance is shared by every level."""
        used = sum(game.hints for game in self.games if game is not None)
        return max(0, DAILY_HINTS - used)

    def state(self, level: int) -> LevelState:
        game = self.game(level)
        if game is not None:
            return {
                GameStatus.PLAY: LevelState.PLAYING,
                GameStatus.WON: LevelState.FILED,
                GameStatus.LOST: LevelState.SEEN,
            }[game.status]
        previous = self.game(level - 1) if level > 1 else None
        unlocked = level == 1 or (previous is not None and previous.status is GameStatus.WON)
        if unlocked and self.outcome is RunOutcome.PLAYING:
            return LevelState.OPEN
        return LevelState.LOCKED
