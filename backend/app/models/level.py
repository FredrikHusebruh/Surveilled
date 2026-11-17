"""Daily levels: the board ranges each level draws from and the difficulty band it must land in."""

from dataclasses import dataclass

from app.models.grade import Grade


@dataclass(frozen=True)
class IntRange:
    """Inclusive integer range."""

    low: int
    high: int

    def __contains__(self, value: object) -> bool:
        return isinstance(value, int) and self.low <= value <= self.high


@dataclass(frozen=True)
class GradeBand:
    """The grades a level accepts. Bands of consecutive levels must not overlap, so every day's
    records get strictly harder from level I to level IV."""

    direct: IntRange
    combined: IntRange
    deep: IntRange

    def admits(self, grade: Grade) -> bool:
        return (
            grade.direct in self.direct
            and grade.combined in self.combined
            and grade.deep in self.deep
        )


@dataclass(frozen=True)
class Level:
    """One of the day's four records. Each day draws a board from these ranges at random."""

    id: int
    name: str
    brief: str
    sizes: tuple[tuple[int, int], ...]
    walls: IntRange
    cameras: IntRange
    lies: bool
    min_clues_per_row: int
    max_hard_rounds: int
    band: GradeBand
