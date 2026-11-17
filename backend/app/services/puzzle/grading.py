"""Difficulty grading: replay a record as a careful player and classify every step they take.

Each round uses the cheapest technique that makes progress, the way a person would: read a single
trusted number first; failing that, propagate every constraint including the camera total and
the Party lie rule (one constraint at a time); failing that, search, which covers weighing several
numbers together and testing hypotheses. The counts are what the daily levels are banded on.
"""

from collections.abc import Sequence

from app.models.grade import Grade
from app.models.puzzle import Board, Clue
from app.services.puzzle.solver import CAMERA, SAFE, UNKNOWN, find_forced


class UngradableRecordError(Exception):
    """The record can't be solved by deduction from its clues. Generated records never are."""


def grade_puzzle(board: Board, clues: Sequence[Clue]) -> Grade:
    known = [UNKNOWN] * board.size
    for clue in clues:
        known[clue.cell] = SAFE
    direct = combined = deep = 0
    while any(known[i] == UNKNOWN and not board.walls[i] for i in range(board.size)):
        step = _direct_step(board, clues, known)
        if step:
            direct += 1
        else:
            result = find_forced(board, clues, known)
            if not result.deductions:
                raise UngradableRecordError("No provable step from here.")
            step = {d.cell: CAMERA if d.is_camera else SAFE for d in result.deductions}
            if result.hard:
                deep += 1
            else:
                combined += 1
        for cell, value in step.items():
            known[cell] = value
    return Grade(direct=direct, combined=combined, deep=deep)


def _direct_step(board: Board, clues: Sequence[Clue], known: list[int]) -> dict[int, int]:
    """Every cell some single trusted number settles. Party records are never trusted alone."""
    given = {clue.cell: clue.shown for clue in clues}
    found: dict[int, int] = {}
    for cell in range(board.size):
        if known[cell] != SAFE or (board.lies and cell in given):
            continue
        value = given.get(cell, board.truth[cell])
        seen = sum(1 for j in board.sight[cell] if known[j] == CAMERA)
        hidden = [j for j in board.sight[cell] if known[j] == UNKNOWN]
        if hidden and value == seen:
            found.update(dict.fromkeys(hidden, SAFE))
        elif hidden and value == seen + len(hidden):
            found.update(dict.fromkeys(hidden, CAMERA))
    return found
