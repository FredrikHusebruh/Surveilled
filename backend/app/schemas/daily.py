"""Shapes for the daily game: the day's four levels and the player's progress through them."""

from datetime import date

from app.models.daily import LevelState, RunOutcome
from app.models.game import ClearOutcome
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
    hints_per_day: int
    hints_left: int
    levels: list[LevelView]


class ClearResponse(ApiModel):
    daily: DailyView
    outcome: ClearOutcome


class HintResponse(ApiModel):
    daily: DailyView
    hint: HintView
