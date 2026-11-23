"""FastAPI dependency providers.

The run store, the training store and the record book are process-wide singletons; services are
cheap per request.
"""

from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.clients import get_supabase_rest
from app.config import Settings, get_settings
from app.services.daily_puzzles import DailyPuzzleBook
from app.services.daily_service import DailyService
from app.services.run_store import RunStore
from app.services.standing_service import StandingService
from app.services.standings_store import (
    StandingsStore,
    SupabaseStandings,
    UnconfiguredStandings,
)
from app.services.training_service import (
    TrainingService,
    TrainingStore,
    new_training_store,
)


@lru_cache
def get_run_store() -> RunStore:
    return RunStore(capacity=get_settings().max_active_runs)


@lru_cache
def get_puzzle_book() -> DailyPuzzleBook:
    return DailyPuzzleBook(salt=get_settings().require_daily_salt())


def get_daily_service(
    store: Annotated[RunStore, Depends(get_run_store)],
    book: Annotated[DailyPuzzleBook, Depends(get_puzzle_book)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> DailyService:
    """In dev mode the levels need not be played in order."""
    return DailyService(
        store, book, launch_day=settings.launch_day, levels_in_order=not settings.dev_mode
    )


DailyServiceDep = Annotated[DailyService, Depends(get_daily_service)]


@lru_cache
def get_training_store() -> TrainingStore:
    return new_training_store(capacity=get_settings().max_active_trainings)


def get_training_service(
    store: Annotated[TrainingStore, Depends(get_training_store)],
) -> TrainingService:
    return TrainingService(store)


TrainingServiceDep = Annotated[TrainingService, Depends(get_training_service)]


def get_standings_store(settings: Annotated[Settings, Depends(get_settings)]) -> StandingsStore:
    """Supabase when it is configured; otherwise every standing is unavailable (and the app
    warned about it at startup)."""
    if settings.supabase_configured:
        return SupabaseStandings(get_supabase_rest())
    return UnconfiguredStandings()


def get_standing_service(
    daily: DailyServiceDep,
    store: Annotated[StandingsStore, Depends(get_standings_store)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> StandingService:
    return StandingService(daily, store, min_players=settings.standing_min_players)


StandingServiceDep = Annotated[StandingService, Depends(get_standing_service)]


def require_dev_mode(settings: Annotated[Settings, Depends(get_settings)]) -> None:
    """Guards developer tools. Outside dev mode they answer 404, as if they didn't exist."""
    if not settings.dev_mode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
