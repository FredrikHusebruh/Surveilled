"""Shapes for training records: a practice game plus the guided moves that open it."""

from app.models.game import ClearOutcome, OpenOutcome
from app.models.training import GuideAction
from app.schemas.base import ApiModel
from app.schemas.games import GameView, HintView


class GuideView(ApiModel):
    cell: int
    action: GuideAction


class TrainingView(ApiModel):
    level: int
    game: GameView
    guides: list[GuideView]


class TrainingClearResponse(ApiModel):
    training: TrainingView
    outcome: ClearOutcome


class TrainingHintResponse(ApiModel):
    training: TrainingView
    hint: HintView


class TrainingOpenResponse(ApiModel):
    training: TrainingView
    outcome: OpenOutcome
