"""Hint finding: the simplest provable step, given only what the player could know.

The day's Camera and Safe hints first point out a wrong mark, if the player has one, then a cell of
their kind: one a single number proves if there is one, else one the solver proves, else (when
nothing proves one yet) any such cell. Pointing out wrong marks first matters for more than help:
otherwise a hint that answers "nothing" would tell the player, for free, that their marks cover
every camera, and marks are free to move.
`find_hint` takes whichever kind is easiest; the tests play records through it.
"""

import random

from app.models.game import Game
from app.models.hint import ClueHint, DeductionHint, Hint, LocatedHint, NoHint, WrongMarkHint
from app.services.puzzle.solver import CAMERA, SAFE, UNKNOWN, find_forced


def find_hint(game: Game) -> Hint:
    """A hint for the player's current position, preferring the easiest kind to follow.

    Wrong marks come first, since every later deduction assumes the marks are right. Then a cell a
    single trusted number proves. Then anything the solver can prove, preferring safe cells.
    """
    wrong_mark = _wrong_mark(game)
    if wrong_mark is not None:
        return wrong_mark

    known = player_knowledge(game)
    clue_hint = _single_clue_hint(game, known)
    if clue_hint is not None:
        return clue_hint

    deductions = find_forced(game.puzzle.board, game.puzzle.clues, known).deductions
    if not deductions:
        return NoHint()
    safe = [d for d in deductions if not d.is_camera]
    chosen = random.choice(safe or deductions)
    return DeductionHint(chosen.cell, chosen.is_camera)


def find_camera_hint(game: Game) -> Hint:
    """Where a camera is: a wrongly marked cell first (the player has it wrong, and every proof
    rests on the marks), then one a single number proves, else one the solver proves, else any
    camera the player hasn't marked."""
    wrong_mark = _wrong_mark(game)
    if wrong_mark is not None:
        return wrong_mark
    return _hint_of_kind(game, is_camera=True, known=player_knowledge(game))


def find_safe_hint(game: Game) -> Hint:
    """Where a safe cell is: a wrongly marked one first (the player has it wrong), then one a single
    number proves, else one the solver proves, else any hidden safe cell."""
    wrong_mark = _wrong_mark(game)
    if wrong_mark is not None:
        return wrong_mark
    return _hint_of_kind(game, is_camera=False, known=player_knowledge(game))


def player_knowledge(game: Game) -> list[int]:
    """Per-cell UNKNOWN/SAFE/CAMERA as the player sees it.

    Marks count as cameras, so check for wrong marks before trusting this.
    """
    board = game.puzzle.board
    known = [UNKNOWN] * board.size
    for clue in game.puzzle.clues:
        known[clue.cell] = SAFE
    for cell in game.cleared:
        known[cell] = SAFE
    for cell in game.exposed | game.marks:
        known[cell] = CAMERA
    return known


def _hint_of_kind(game: Game, *, is_camera: bool, known: list[int]) -> Hint:
    clue_hint = _single_clue_hint(game, known, want_camera=is_camera)
    if clue_hint is not None:
        return clue_hint
    board = game.puzzle.board
    deductions = find_forced(board, game.puzzle.clues, known).deductions
    proved = [d.cell for d in deductions if d.is_camera is is_camera]
    if proved:
        return DeductionHint(random.choice(proved), is_camera)
    left = [cell for cell in range(board.size) if known[cell] == UNKNOWN and not board.walls[cell]]
    of_kind = [cell for cell in left if board.cameras[cell] is is_camera]
    if not of_kind:
        return NoHint()
    return LocatedHint(random.choice(of_kind), is_camera)


def _wrong_mark(game: Game) -> WrongMarkHint | None:
    board = game.puzzle.board
    wrong_marks = sorted(cell for cell in game.marks if not board.cameras[cell])
    return WrongMarkHint(wrong_marks[0]) if wrong_marks else None


def _single_clue_hint(
    game: Game, known: list[int], *, want_camera: bool | None = None
) -> ClueHint | None:
    """The first trusted number whose hidden cells are all safe or all cameras, if any, and of the
    wanted kind when `want_camera` is given.

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
        if want_camera is not None and is_camera is not want_camera:
            continue
        return ClueHint(cell, hidden[0], is_camera, value, cameras_seen, len(hidden))
    return None
