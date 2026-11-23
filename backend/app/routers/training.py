"""Training endpoints: practice records played with the real rules, never counted or ranked."""

from fastapi import APIRouter

from app.dependencies import TrainingServiceDep
from app.models.game import Game
from app.models.hint import HintKind
from app.player import PlayerDep
from app.schemas.games import CellRequest, HintRequest
from app.schemas.training import (
    GuideView,
    TrainingClearResponse,
    TrainingHintResponse,
    TrainingOpenResponse,
    TrainingView,
)
from app.services.game_view import build_game_view, build_hint_view
from app.services.training_records import training_record
from app.services.training_service import TrainingService

router = APIRouter(prefix="/api/training", tags=["training"])

_LEVEL = "`level` is the record of the day the training prepares for, 1 to 4."


@router.post(
    "/{level}/start",
    summary="Start a training record",
    description=f"Deals a fresh game of the training record, replacing any earlier one. {_LEVEL}",
)
def start_training(level: int, player: PlayerDep, service: TrainingServiceDep) -> TrainingView:
    return _view(service, level, service.start(player, level))


@router.post(
    "/{level}/clear",
    summary="Clear a cell in training",
    description="Clears a hidden, unmarked cell. A camera is a strike; three lose the record.",
)
def clear_cell(
    level: int, body: CellRequest, player: PlayerDep, service: TrainingServiceDep
) -> TrainingClearResponse:
    game, outcome = service.clear(player, level, body.cell)
    return TrainingClearResponse(training=_view(service, level, game), outcome=outcome)


@router.post(
    "/{level}/mark",
    summary="Toggle a camera mark in training",
    description="Marks a hidden cell as a camera, or removes the mark. Marks are notes.",
)
def toggle_mark(
    level: int, body: CellRequest, player: PlayerDep, service: TrainingServiceDep
) -> TrainingView:
    return _view(service, level, service.mark(player, level, body.cell))


@router.post(
    "/{level}/stamp",
    summary="Toggle a False stamp in training",
    description="Stamps a Party record false, or removes the stamp. Stamps change nothing.",
)
def toggle_stamp(
    level: int, body: CellRequest, player: PlayerDep, service: TrainingServiceDep
) -> TrainingView:
    return _view(service, level, service.stamp(player, level, body.cell))


@router.post(
    "/{level}/hint",
    summary="Show a camera or a safe cell in training",
    description="Points at a camera or a safe cell, proved if possible. Free and unlimited here.",
)
def take_hint(
    level: int, body: HintRequest, player: PlayerDep, service: TrainingServiceDep
) -> TrainingHintResponse:
    game, hint = service.hint(player, level, HintKind(body.kind))
    return TrainingHintResponse(training=_view(service, level, game), hint=build_hint_view(hint))


@router.post(
    "/{level}/open",
    summary="Open a cell (hint) in training",
    description="Opens a hidden or marked cell: a safe cell is cleared, a camera is marked with no "
    "strike. Free and unlimited here.",
)
def open_cell(
    level: int, body: CellRequest, player: PlayerDep, service: TrainingServiceDep
) -> TrainingOpenResponse:
    game, outcome = service.open(player, level, body.cell)
    return TrainingOpenResponse(training=_view(service, level, game), outcome=outcome)


def _view(service: TrainingService, level: int, game: Game) -> TrainingView:
    record = training_record(level)
    return TrainingView(
        level=level,
        game=build_game_view(game, service.now()),
        guides=[GuideView(cell=guide.cell, action=guide.action) for guide in record.guides],
    )
