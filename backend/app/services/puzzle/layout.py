"""Boards drawn by hand: one string per row, '#' a wall, 'C' a camera and '.' an empty floor cell.

Sight lines and true counts are derived the same way the generator derives them, so a drawn board
plays exactly like a generated one.
"""

from collections.abc import Sequence

from app.models.puzzle import Board
from app.services.puzzle.sight import compute_sight_lines


def board_from_layout(layout: Sequence[str], *, lies: bool = False) -> Board:
    """The board `layout` draws. Raises ValueError on ragged rows or an unknown character."""
    rows, cols = len(layout), len(layout[0]) if layout else 0
    if cols == 0 or any(len(row) != cols for row in layout):
        raise ValueError(f"Board rows must all have the same length: {list(layout)}")
    cells = "".join(layout)
    unknown = set(cells) - {"#", "C", "."}
    if unknown:
        raise ValueError(f"Unknown board characters {sorted(unknown)} in {list(layout)}")
    walls = tuple(ch == "#" for ch in cells)
    cameras = tuple(ch == "C" for ch in cells)
    sight = compute_sight_lines(rows, cols, walls)
    truth = tuple(sum(cameras[j] for j in sight[i]) for i in range(rows * cols))
    return Board(rows, cols, walls, cameras, sight, truth, lies)
