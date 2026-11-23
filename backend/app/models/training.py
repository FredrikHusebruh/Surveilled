"""Training records: small hand-drawn records that teach one level's rules by playing them."""

from dataclasses import dataclass
from enum import StrEnum

from app.models.puzzle import Puzzle


class GuideAction(StrEnum):
    """The move a guided step asks for. Selecting a number is a UI move the server never sees."""

    SELECT = "select"
    CLEAR = "clear"
    MARK = "mark"
    STAMP = "stamp"


@dataclass(frozen=True)
class Guide:
    """One guided move: the cell the player tries a new rule on, and what to do with it."""

    cell: int
    action: GuideAction


@dataclass(frozen=True)
class TrainingRecord:
    """A training record for `level`. `guides` come first, in order; then the player plays freely.

    Guides are teaching content, not rules: the server sends them and never enforces them.
    """

    level: int
    puzzle: Puzzle
    rating: int
    guides: tuple[Guide, ...]
