"""The four training records, one per level of the day, drawn by hand.

Each teaches its level's new rule: a few guided moves on outlined cells, then free play until the
record is filed. They are small (5x5) and easy, and `tests/services/test_training_records.py`
checks that each one is solved by deduction alone and that every guided move is right. The
frontend's words for each step (frontend/src/game/training.ts) name these cells, so changing a
layout or a guide means changing those words too.
"""

from dataclasses import dataclass
from functools import cache

from app.models.puzzle import Clue, Puzzle
from app.models.training import Guide, GuideAction, TrainingRecord
from app.services.errors import UnknownLevelError
from app.services.puzzle.grading import grade_puzzle
from app.services.puzzle.layout import board_from_layout


@dataclass(frozen=True)
class _Drawing:
    """A training record as drawn. `clues` are (cell, offset): 0 shows the true count, and +1 or
    -1 makes it a false Party record (exactly one per row on boards with lies)."""

    layout: tuple[str, ...]
    lies: bool
    clues: tuple[tuple[int, int], ...]
    guides: tuple[Guide, ...]


_DRAWINGS: dict[int, _Drawing] = {
    # Basics. The given 0 makes its lines safe; the cell cleared on its row is a 0 too and opens
    # most of the board. Then the 4 has exactly four hidden cells left in line: all cameras.
    1: _Drawing(
        layout=("...C.", ".....", ".C..C", ".....", "...C."),
        lies=False,
        clues=((7, 0), (13, 0), (18, 0)),
        guides=(
            Guide(7, GuideAction.SELECT),
            Guide(5, GuideAction.CLEAR),
            Guide(13, GuideAction.SELECT),
            Guide(3, GuideAction.MARK),
        ),
    ),
    # Walls. The 1 on the right of the fourth row: a wall cuts its row short, with a camera behind
    # it, and a wall right above it, so one hidden cell is left in line with it. The cell top left
    # of the wall is walled off from every number, so only the camera count frees it.
    2: _Drawing(
        layout=("C.#..", "C#...", "..#.#", "C.#C.", "....."),
        lies=False,
        clues=((7, 0), (13, 0), (19, 0), (24, 0)),
        guides=(Guide(19, GuideAction.SELECT),),
    ),
    # Party records. The red 1 walled in on the fourth row is alone in its row, so it lies. With one
    # cell in line it can't mean 2, so it means 0 and that cell is safe. Cleared, that cell shows a
    # black 2 with the same two hidden cells in line as the red 1 beside it: that red 1 is the lie.
    # No red number shows more than its hidden cells, so no lie is given away at a glance.
    3: _Drawing(
        layout=("...C.", "CC...", ".#...", "#.#..", "..CC."),
        lies=True,
        clues=((16, 1), (0, 0), (1, 1), (20, -1), (24, 0)),
        guides=(
            Guide(16, GuideAction.STAMP),
            Guide(21, GuideAction.CLEAR),
            Guide(20, GuideAction.STAMP),
        ),
    ),
    # Combining. The two 1s share the second row: the left one's camera is among the cells the
    # right one counts too, so the right one's other cells are safe.
    4: _Drawing(
        layout=(".#...", "..C..", ".##..", "C....", "C...."),
        lies=False,
        clues=((6, 0), (9, 0), (21, 0), (22, 0)),
        guides=(Guide(6, GuideAction.SELECT), Guide(9, GuideAction.SELECT)),
    ),
}

TRAINING_LEVELS = tuple(sorted(_DRAWINGS))


@cache
def training_record(level: int) -> TrainingRecord:
    """The training record for `level`. Raises UnknownLevelError for a level without one."""
    drawing = _DRAWINGS.get(level)
    if drawing is None:
        raise UnknownLevelError(level)
    board = board_from_layout(drawing.layout, lies=drawing.lies)
    clues = tuple(
        Clue(cell, board.truth[cell] + offset, liar=offset != 0) for cell, offset in drawing.clues
    )
    puzzle = Puzzle(seed=level, board=board, clues=clues)
    rating = grade_puzzle(board, clues).rating
    return TrainingRecord(level=level, puzzle=puzzle, rating=rating, guides=drawing.guides)
