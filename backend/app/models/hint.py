"""Hints: one provable step the player can take next, with what proves it."""

from dataclasses import dataclass


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
class NoHint:
    """The solver found nothing new to prove from what the player knows."""


type Hint = WrongMarkHint | ClueHint | DeductionHint | NoHint
