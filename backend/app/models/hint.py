"""Hints: where a camera or a safe cell is, with what proves it when something does.

A player gets one hint of each kind a day: Open opens a cell they choose, Camera shows a camera,
Safe shows a safe cell.
"""

from dataclasses import dataclass
from enum import StrEnum


class HintKind(StrEnum):
    """The three kinds of hint. The order is the order the player sees them in."""

    OPEN = "open"
    CAMERA = "camera"
    SAFE = "safe"


@dataclass(frozen=True)
class WrongMarkHint:
    """One of the player's marks sits on a safe cell."""

    cell: int


@dataclass(frozen=True)
class ClueHint:
    """One number proves `cell`: it already sees all its cameras, or needs every hidden cell."""

    clue_cell: int
    cell: int
    is_camera: bool
    clue_value: int
    cameras_seen: int
    hidden_seen: int


@dataclass(frozen=True)
class DeductionHint:
    """`cell` is provable, but only from several numbers, the camera total or the lie rule."""

    cell: int
    is_camera: bool


@dataclass(frozen=True)
class LocatedHint:
    """`cell` is a camera (or safe), though nothing the player knows proves it yet."""

    cell: int
    is_camera: bool


@dataclass(frozen=True)
class NoHint:
    """The solver found nothing new to prove from what the player knows."""


type Hint = WrongMarkHint | ClueHint | DeductionHint | LocatedHint | NoHint
