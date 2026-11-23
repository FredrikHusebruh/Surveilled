"""Daily game endpoints. Every response carries the whole day, so the client never tracks rules."""

from datetime import date

from fastapi import APIRouter, Depends

from app.dependencies import DailyServiceDep, StandingServiceDep, require_dev_mode
from app.models.daily import DailyRun
from app.models.hint import HintKind
from app.player import PlayerDep
from app.schemas.daily import ClearResponse, DailyView, HintResponse, OpenResponse
from app.schemas.games import CellRequest, HintRequest
from app.schemas.standing import StandingView
from app.services.daily_service import DailyService
from app.services.daily_view import build_daily_view
from app.services.game_view import build_hint_view
from app.services.standing_view import build_standing_view

router = APIRouter(prefix="/api/daily", tags=["daily"])

_DAY = "`day` is the player's local date; days more than one day from UTC are not open."


@router.get("/{day}", summary="Get a day", description=f"The four levels and your progress. {_DAY}")
def get_day(day: date, player: PlayerDep, service: DailyServiceDep) -> DailyView:
    return _view(service, service.run(player, day))


@router.delete(
    "/{day}",
    summary="Reset your day (dev mode only)",
    description="Forgets your progress on `day`, lock-out included. 404 unless "
    "SURVEILLED_DEV_MODE is true.",
    dependencies=[Depends(require_dev_mode)],
)
def reset_day(day: date, player: PlayerDep, service: DailyServiceDep) -> DailyView:
    return _view(service, service.reset(player, day))


@router.post(
    "/{day}/levels/{level}/start",
    summary="Open a level",
    description="Starts the level's clock. Levels open in order; being seen closes the day.",
)
def start_level(day: date, level: int, player: PlayerDep, service: DailyServiceDep) -> DailyView:
    return _view(service, service.start(player, day, level))


@router.post(
    "/{day}/levels/{level}/clear",
    summary="Clear a cell",
    description="Clears a hidden, unmarked cell. A camera is a strike; three end the day.",
)
def clear_cell(
    day: date, level: int, body: CellRequest, player: PlayerDep, service: DailyServiceDep
) -> ClearResponse:
    run, outcome = service.clear(player, day, level, body.cell)
    return ClearResponse(daily=_view(service, run), outcome=outcome)


@router.post(
    "/{day}/levels/{level}/mark",
    summary="Toggle a camera mark",
    description="Marks a hidden cell as a camera, or removes the mark. Marks are notes.",
)
def toggle_mark(
    day: date, level: int, body: CellRequest, player: PlayerDep, service: DailyServiceDep
) -> DailyView:
    return _view(service, service.mark(player, day, level, body.cell))


@router.post(
    "/{day}/levels/{level}/stamp",
    summary="Toggle a False stamp",
    description="Stamps a Party record false, or removes the stamp. Stamps change nothing.",
)
def toggle_stamp(
    day: date, level: int, body: CellRequest, player: PlayerDep, service: DailyServiceDep
) -> DailyView:
    return _view(service, service.stamp(player, day, level, body.cell))


@router.post(
    "/{day}/levels/{level}/hint",
    summary="Show a camera or a safe cell",
    description="Points at a camera or a safe cell: one a single number proves if there is one, "
    "else one the solver proves, else any. Counts against the record unless none is found. "
    "A player gets one hint of each kind a day across all levels; a second answers 409.",
)
def take_hint(
    day: date, level: int, body: HintRequest, player: PlayerDep, service: DailyServiceDep
) -> HintResponse:
    run, hint = service.hint(player, day, level, HintKind(body.kind))
    return HintResponse(daily=_view(service, run), hint=build_hint_view(hint))


@router.post(
    "/{day}/levels/{level}/open",
    summary="Open a cell (hint)",
    description="The Open hint: opens a hidden or marked cell the player chose. A safe cell is "
    "cleared; a camera is marked, with no strike. One a day across all levels; a second answers "
    "409.",
)
def open_cell(
    day: date, level: int, body: CellRequest, player: PlayerDep, service: DailyServiceDep
) -> OpenResponse:
    run, outcome = service.open(player, day, level, body.cell)
    return OpenResponse(daily=_view(service, run), outcome=outcome)


@router.post(
    "/{day}/standing",
    summary="Record your day and get your standing",
    description="Once your day is over, records its score (adjusted time: the clock plus a "
    "penalty per hint and per strike; the first recorded result stands) and ranks it among "
    "everyone who has finished the same day so far: more levels filed first, then lower score. "
    "409 while the day is in play; 503 when rankings are unavailable.",
)
def record_standing(day: date, player: PlayerDep, standings: StandingServiceDep) -> StandingView:
    return build_standing_view(standings.record(player, day))


def _view(service: DailyService, run: DailyRun) -> DailyView:
    return build_daily_view(
        run, service.day_number(run.day), service.now(), levels_in_order=service.levels_in_order
    )
