"""Shapes for the daily game: the day's four levels and the player's progress through them."""

from datetime import date

from pydantic import Field

from app.models.daily import LevelState, RunOutcome
from app.models.game import ClearOutcome, OpenOutcome
from app.models.hint import HintKind
from app.schemas.base import ApiModel
from app.schemas.games import GameView, HintView


class LevelView(ApiModel):
    level: int
    name: str
    brief: str
    state: LevelState
    game: GameView | None = None


class DailyView(ApiModel):
    day: date
    day_number: int
    outcome: RunOutcome
    hints_available: list[HintKind] = Field(
        description="The kinds of hint left today, one of each a day across all levels."
    )
    levels: list[LevelView]


class ClearResponse(ApiModel):
    daily: DailyView
    outcome: ClearOutcome


class HintResponse(ApiModel):
    daily: DailyView
    hint: HintView


class OpenResponse(ApiModel):
    daily: DailyView
    outcome: OpenOutcome
