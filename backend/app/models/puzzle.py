"""Puzzle data: the hidden truth of a record and the numbers the player starts with."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Clue:
    """A number given at the start of a record. A liar is a Party record off by exactly one."""

    cell: int
    shown: int
    liar: bool


@dataclass(frozen=True)
class Board:
    """Walls, camera positions and every cell's true count.

    Cells are indexed row-major (`row * cols + col`). `sight[i]` lists the cells that cell `i` can
    see. Sight is symmetric, so it is also the set of cells whose camera would see `i`.
    """

    rows: int
    cols: int
    walls: tuple[bool, ...]
    cameras: tuple[bool, ...]
    sight: tuple[tuple[int, ...], ...]
    truth: tuple[int, ...]
    lies: bool

    @property
    def size(self) -> int:
        return self.rows * self.cols

    @property
    def camera_count(self) -> int:
        return sum(self.cameras)

    @property
    def safe_cells(self) -> tuple[int, ...]:
        """Floor cells without a camera, in index order."""
        return tuple(i for i in range(self.size) if not self.walls[i] and not self.cameras[i])


@dataclass(frozen=True)
class Puzzle:
    """A generated record: its board and starting clues. `seed` doubles as the record number."""

    seed: int
    board: Board
    clues: tuple[Clue, ...]

    def clue_at(self, cell: int) -> Clue | None:
        """The starting clue on `cell`, or None when the cell wasn't given."""
        return next((clue for clue in self.clues if clue.cell == cell), None)
