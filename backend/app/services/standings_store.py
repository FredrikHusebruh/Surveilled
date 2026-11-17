"""Where finished days are recorded and ranked: Supabase in production.

The ranking itself runs in the database (`record_day_result` in supabase/migrations), so a
standing never needs every row of a day pulled over the network.
"""

import logging
from datetime import date
from typing import Protocol

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.models.daily import LEVEL_COUNT
from app.models.standing import DayScore, ScoreCurve, Standing
from app.services.errors import RankingsUnavailableError

logger = logging.getLogger("surveilled.standings")

CURVE_BINS = 16


class StandingsStore(Protocol):
    def record(self, day: date, player_hash: str, score: DayScore) -> Standing:
        """Store the player's finished day (the first stored result stands) and rank it among
        everyone who has finished `day` so far. Raises RankingsUnavailableError on failure."""
        ...


class _Row(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", strict=True)


class _CurveRow(_Row):
    low_seconds: int = Field(ge=0)
    high_seconds: int = Field(ge=0)
    counts: list[int] = Field(min_length=CURVE_BINS, max_length=CURVE_BINS)


class _StandingRow(_Row):
    """The JSON `record_day_result` returns, checked before anything trusts it."""

    players: int = Field(ge=1)
    ahead_of: int = Field(ge=0)
    levels_filed: int = Field(ge=0, le=LEVEL_COUNT)
    score_seconds: int = Field(ge=0)
    reached: list[int] = Field(min_length=LEVEL_COUNT + 1, max_length=LEVEL_COUNT + 1)
    curve: _CurveRow


class SupabaseStandings:
    """Records and ranks through the `record_day_result` database function."""

    def __init__(self, client: httpx.Client) -> None:
        self._client = client

    def record(self, day: date, player_hash: str, score: DayScore) -> Standing:
        payload = {
            "p_day": day.isoformat(),
            "p_player_hash": player_hash,
            "p_levels_filed": score.levels_filed,
            "p_score_seconds": score.total_seconds,
            "p_bins": CURVE_BINS,
        }
        try:
            response = self._client.post("/rpc/record_day_result", json=payload)
            response.raise_for_status()
            row = _StandingRow.model_validate_json(response.content)
        except (httpx.HTTPError, ValidationError) as error:
            logger.exception("Recording the result for %s in Supabase failed", day.isoformat())
            raise RankingsUnavailableError() from error
        return Standing(
            players=row.players,
            ahead_of=row.ahead_of,
            levels_filed=row.levels_filed,
            score_seconds=row.score_seconds,
            reached=tuple(row.reached),
            curve=ScoreCurve(
                low_seconds=row.curve.low_seconds,
                high_seconds=row.curve.high_seconds,
                counts=tuple(row.curve.counts),
            ),
        )


class UnconfiguredStandings:
    """Stands in when Supabase isn't configured: every standing is unavailable. The app logs a
    warning at startup, so this is never a silent fallback."""

    def record(self, day: date, player_hash: str, score: DayScore) -> Standing:
        raise RankingsUnavailableError()
