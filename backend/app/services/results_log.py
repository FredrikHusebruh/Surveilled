"""Anonymous results, one log line per closed record, for tuning the difficulty bands.

The bands are an educated starting point; real completion rates and times per level are how the
sweet spot gets found. No player id is logged.
"""

import logging
from datetime import date

from app.models.game import Game

logger = logging.getLogger("surveilled.results")


def log_record_closed(day: date, level: int, game: Game) -> None:
    if game.finished_at is None:
        raise ValueError("Only closed records are logged.")
    logger.info(
        "record closed day=%s level=%d record=%d status=%s seconds=%d strikes=%d hints=%d "
        "rating=%d",
        day.isoformat(),
        level,
        game.puzzle.seed,
        game.status.value,
        game.elapsed_seconds(game.finished_at),
        game.strikes,
        game.hints,
        game.rating,
    )
