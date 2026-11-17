"""Hint finding: the simplest provable next step, given only what the player could know."""

import random

from app.models.game import Game
from app.models.hint import ClueHint, DeductionHint, Hint, NoHint, WrongMarkHint
from app.services.puzzle.solver import CAMERA, SAFE, UNKNOWN, find_forced


def find_hint(game: Game) -> Hint:
    """A hint for the player's current position, preferring the easiest kind to follow.

    Wrong marks come first, since every later deduction assumes the marks are right. Then a cell a
    single trusted number proves. Then anything the solver can prove, preferring safe cells.
    """
    board = game.puzzle.board
    wrong_marks = sorted(cell for cell in game.marks if not board.cameras[cell])
    if wrong_marks:
        return WrongMarkHint(wrong_marks[0])

    known = player_knowledge(game)
    clue_hint = _single_clue_hint(game, known)
    if clue_hint is not None:
        return clue_hint

    deductions = find_forced(board, game.puzzle.clues, known).deductions
    if not deductions:
        return NoHint()
    safe = [d for d in deductions if not d.is_camera]
    chosen = random.choice(safe or deductions)
    return DeductionHint(chosen.cell, chosen.is_camera)


def player_knowledge(game: Game) -> list[int]:
    """Per-cell UNKNOWN/SAFE/CAMERA as the player sees it.

    Marks count as cameras, so check for wrong marks before trusting this.
    """
    known = [UNKNOWN] * game.puzzle.board.size
    for clue in game.puzzle.clues:
        known[clue.cell] = SAFE
    for cell in game.cleared:
        known[cell] = SAFE
    for cell in game.exposed | game.marks:
        known[cell] = CAMERA
    return known


def _single_clue_hint(game: Game, known: list[int]) -> ClueHint | None:
    """The first trusted number whose hidden cells are all safe or all cameras, if any.

    Party records are never trusted: one in each row is false.
    """
    puzzle = game.puzzle
    board = puzzle.board
    given = [] if board.lies else [clue.cell for clue in puzzle.clues]
    for cell in [*given, *sorted(game.cleared)]:
        clue = puzzle.clue_at(cell)
        value = clue.shown if clue is not None else board.truth[cell]
        cameras_seen = sum(1 for j in board.sight[cell] if known[j] == CAMERA)
        hidden = [j for j in board.sight[cell] if known[j] == UNKNOWN]
        if not hidden:
            continue
        if value == cameras_seen:
            is_camera = False
        elif value == cameras_seen + len(hidden):
            is_camera = True
        else:
            continue
        return ClueHint(cell, hidden[0], is_camera, value, cameras_seen, len(hidden))
    return None
