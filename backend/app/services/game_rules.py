"""Game rules: pure transitions from one Game to the next.

Every move is validated here, never trusted.
"""

from dataclasses import replace

from app.models.daily import DailyPuzzle
from app.models.game import MAX_STRIKES, ClearOutcome, Game, GameStatus
from app.models.hint import Hint, NoHint
from app.services.errors import GameOverError, InvalidMoveError
from app.services.hints import find_hint


def new_game(record: DailyPuzzle, now: float) -> Game:
    """A fresh game on `record`, with three new strikes and the clock starting at `now`."""
    return Game(puzzle=record.puzzle, rating=record.grade.rating, started_at=now)


def clear_cell(game: Game, cell: int, now: float) -> tuple[Game, ClearOutcome]:
    """Clear a hidden cell. A camera is a strike; a zero also clears every cell it sees."""
    _require_open(game)
    _require_unrevealed(game, cell)
    if cell in game.marks:
        raise InvalidMoveError("That cell is marked as a camera. Remove the mark first.")

    board = game.puzzle.board
    if board.cameras[cell]:
        exposed = game.exposed | {cell}
        lost = len(exposed) >= MAX_STRIKES
        return (
            replace(
                game,
                exposed=exposed,
                status=GameStatus.LOST if lost else game.status,
                finished_at=now if lost else game.finished_at,
            ),
            ClearOutcome.SEEN,
        )

    given = {clue.cell for clue in game.puzzle.clues}
    cleared = set(game.cleared)
    pending = [cell]
    while pending:
        j = pending.pop()
        if j in cleared or j in given or j in game.marks:
            continue
        cleared.add(j)
        if board.truth[j] == 0:
            pending.extend(k for k in board.sight[j] if not board.cameras[k])

    won = len(cleared) + len(given) >= len(board.safe_cells)
    outcome = ClearOutcome.CASCADE if board.truth[cell] == 0 else ClearOutcome.CLEARED
    return (
        replace(
            game,
            cleared=frozenset(cleared),
            status=GameStatus.WON if won else game.status,
            finished_at=now if won else game.finished_at,
        ),
        outcome,
    )


def toggle_mark(game: Game, cell: int) -> Game:
    """Mark a hidden cell as a camera, or remove the mark."""
    _require_open(game)
    _require_unrevealed(game, cell)
    return replace(game, marks=game.marks ^ {cell})


def toggle_stamp(game: Game, cell: int) -> Game:
    """Stamp a Party record false, or remove the stamp. A stamp is a note; it changes no rules."""
    _require_open(game)
    _require_in_board(game, cell)
    if not game.puzzle.board.lies or game.puzzle.clue_at(cell) is None:
        raise InvalidMoveError("Only Party records can be stamped.")
    return replace(game, stamps=game.stamps ^ {cell})


def take_hint(game: Game) -> tuple[Game, Hint]:
    """Find a hint and count it against the record. Finding nothing costs nothing."""
    _require_open(game)
    hint = find_hint(game)
    if isinstance(hint, NoHint):
        return game, hint
    return replace(game, hints=game.hints + 1), hint


def _require_open(game: Game) -> None:
    if game.status is not GameStatus.PLAY:
        raise GameOverError()


def _require_in_board(game: Game, cell: int) -> None:
    if not 0 <= cell < game.puzzle.board.size:
        raise InvalidMoveError("That cell is not on the record.")


def _require_unrevealed(game: Game, cell: int) -> None:
    _require_in_board(game, cell)
    if game.puzzle.board.walls[cell]:
        raise InvalidMoveError("That cell is a wall.")
    if game.puzzle.clue_at(cell) is not None or cell in game.cleared or cell in game.exposed:
        raise InvalidMoveError("That cell is already revealed.")
