"""Use case: once a player's day is over, record its score and see how it compares."""

import hashlib
from dataclasses import dataclass
from datetime import date

from app.models.daily import RunOutcome
from app.models.standing import DayScore, Standing
from app.services.daily_service import DailyService
from app.services.errors import DayNotOverError
from app.services.scoring import day_score
from app.services.standings_store import StandingsStore


@dataclass(frozen=True)
class DayStanding:
    """A finished day's score and its place among everyone who has finished the same day.

    Players finish a day over about 36 hours, from the first time zone's midnight to the end of
    the day in the last one, so a standing is only ever "so far".
    """

    day: date
    day_number: int
    score: DayScore
    standing: Standing
    comparable: bool


class StandingService:
    def __init__(self, daily: DailyService, store: StandingsStore, min_players: int) -> None:
        self._daily = daily
        self._store = store
        self._min_players = min_players

    def record(self, player_id: str, day: date) -> DayStanding:
        """Record the player's finished day and return its standing. Raises DayNotOverError while
        the day is still being played. The score comes from the server's own run, never from the
        client."""
        run = self._daily.run(player_id, day)
        if run.outcome is RunOutcome.PLAYING:
            raise DayNotOverError()
        score = day_score(run)
        standing = self._store.record(day, player_hash(player_id), score)
        return DayStanding(
            day=day,
            day_number=self._daily.day_number(day),
            score=score,
            standing=standing,
            comparable=standing.players >= self._min_players,
        )


def player_hash(player_id: str) -> str:
    """What the database knows a player by: a one-way hash of their cookie id, so the stored
    results can never be turned back into a cookie that plays as them."""
    return hashlib.sha256(player_id.encode()).hexdigest()
