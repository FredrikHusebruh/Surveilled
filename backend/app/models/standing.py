"""Scores and standings: how a player's finished day compares with everyone else's that day."""

from dataclasses import dataclass


@dataclass(frozen=True)
class LevelScore:
    """One played level's adjusted time: the clock plus a fixed penalty per hint and per strike."""

    level: int
    filed: bool
    seconds: int
    hints: int
    strikes: int
    hint_penalty_seconds: int
    strike_penalty_seconds: int

    @property
    def total_seconds(self) -> int:
        return self.seconds + self.hint_penalty_seconds + self.strike_penalty_seconds


@dataclass(frozen=True)
class DayScore:
    """A finished day. Days rank by how many levels were filed, then by adjusted time (lower
    is better), so every toppled day ranks above every day that ended in being seen."""

    levels: tuple[LevelScore, ...]

    @property
    def levels_filed(self) -> int:
        return sum(1 for level in self.levels if level.filed)

    @property
    def total_seconds(self) -> int:
        return sum(level.total_seconds for level in self.levels)


@dataclass(frozen=True)
class ScoreCurve:
    """How the scores of players who got as far as you are spread: `counts[i]` players in the
    i-th of equal-width bins from `low_seconds` to `high_seconds` (the outer 2% are folded into
    the end bins, so one very slow day can't flatten the curve)."""

    low_seconds: int
    high_seconds: int
    counts: tuple[int, ...]


@dataclass(frozen=True)
class Standing:
    """A player's place among everyone who has finished the same day so far.

    The recorded result is the first one stored for the player that day; `ahead_of` counts the
    players it beats outright. `reached[n]` is how many players filed exactly n levels.
    """

    players: int
    ahead_of: int
    levels_filed: int
    score_seconds: int
    reached: tuple[int, ...]
    curve: ScoreCurve
