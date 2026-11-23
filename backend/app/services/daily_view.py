"""Projection of a player's day into what the client may see. Each game goes through
`build_game_view`, which holds camera positions back while a record is open."""

from app.models.daily import LEVEL_COUNT, DailyRun
from app.schemas.daily import DailyView, LevelView
from app.services.game_view import build_game_view
from app.services.levels import get_level


def build_daily_view(
    run: DailyRun, day_number: int, now: float, *, levels_in_order: bool = True
) -> DailyView:
    levels: list[LevelView] = []
    for level_id in range(1, LEVEL_COUNT + 1):
        level = get_level(level_id)
        game = run.game(level_id)
        levels.append(
            LevelView(
                level=level.id,
                name=level.name,
                brief=level.brief,
                state=run.state(level_id, in_order=levels_in_order),
                game=None if game is None else build_game_view(game, now),
            )
        )
    return DailyView(
        day=run.day,
        day_number=day_number,
        outcome=run.outcome,
        hints_available=list(run.hints_available),
        levels=levels,
    )
