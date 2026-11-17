"""Surveilled API entry point. Run with `uv run fastapi dev app/main.py` from backend/."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.dependencies import get_puzzle_book, get_run_store
from app.error_handlers import register_error_handlers
from app.routers import daily
from app.services.daily_service import DailyService
from app.services.puzzle_warmer import PuzzleWarmer


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None]:
    """Check settings and start warming the daily records before serving anyone."""
    _configure_logging()
    settings = get_settings()
    if not settings.supabase_configured:
        logging.getLogger("surveilled").warning(
            "Supabase is not configured, so standings are off. See backend/.env.example."
        )
    service = DailyService(get_run_store(), get_puzzle_book(), launch_day=settings.launch_day)
    warmer = PuzzleWarmer(get_puzzle_book(), service.open_days)
    warmer.start()
    try:
        yield
    finally:
        warmer.stop()


def _configure_logging() -> None:
    logger = logging.getLogger("surveilled")
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Surveilled API",
        summary="Server-authoritative engine for the Surveilled daily logic puzzle.",
        lifespan=lifespan,
    )
    register_error_handlers(app)
    app.include_router(daily.router)
    return app


app = create_app()
