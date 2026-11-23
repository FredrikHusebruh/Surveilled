"""Projection of server-side games and hints into what the player may see.

This is the one place that decides what leaves the server, so it is where camera positions are
held back while a record is open.
"""

from app.models.game import MAX_STRIKES, Game, GameStatus
from app.models.hint import ClueHint, DeductionHint, Hint, LocatedHint, NoHint, WrongMarkHint
from app.schemas.games import (
    CellView,
    ClueHintView,
    DeductionHintView,
    ExposedCell,
    GameView,
    GivenCell,
    HiddenCell,
    HintView,
    LocatedHintView,
    MarkedCell,
    NoHintView,
    ObservationCell,
    RevealedCell,
    Verdict,
    WallCell,
    WrongMarkHintView,
)


def build_game_view(game: Game, now: float) -> GameView:
    puzzle = game.puzzle
    board = puzzle.board
    return GameView(
        record_no=puzzle.seed,
        rows=board.rows,
        cols=board.cols,
        lies=board.lies,
        camera_count=board.camera_count,
        rating=game.rating,
        status=game.status,
        strikes=game.strikes,
        max_strikes=MAX_STRIKES,
        hints=game.hints,
        elapsed_seconds=game.elapsed_seconds(now),
        cells=[_cell_view(game, cell) for cell in range(board.size)],
        sight_lines=[list(line) for line in board.sight],
    )


def build_hint_view(hint: Hint) -> HintView:
    match hint:
        case WrongMarkHint(cell=cell):
            return WrongMarkHintView(cell=cell)
        case ClueHint():
            return ClueHintView(
                clue_cell=hint.clue_cell,
                cell=hint.cell,
                verdict=_verdict(hint.is_camera),
                clue_value=hint.clue_value,
                cameras_seen=hint.cameras_seen,
                hidden_seen=hint.hidden_seen,
            )
        case DeductionHint(cell=cell, is_camera=is_camera):
            return DeductionHintView(cell=cell, verdict=_verdict(is_camera))
        case LocatedHint(cell=cell, is_camera=is_camera):
            return LocatedHintView(cell=cell, verdict=_verdict(is_camera))
        case NoHint():
            return NoHintView()


def _cell_view(game: Game, cell: int) -> CellView:
    board = game.puzzle.board
    closed = game.status is not GameStatus.PLAY
    if board.walls[cell]:
        return WallCell()
    clue = game.puzzle.clue_at(cell)
    if clue is not None:
        return GivenCell(value=clue.shown, stamped=cell in game.stamps)
    if cell in game.cleared:
        return ObservationCell(value=board.truth[cell])
    if cell in game.exposed:
        return ExposedCell()
    if cell in game.marks:
        return MarkedCell(wrong=closed and not board.cameras[cell])
    if closed and board.cameras[cell]:
        return RevealedCell()
    return HiddenCell()


def _verdict(is_camera: bool) -> Verdict:
    return "camera" if is_camera else "safe"
