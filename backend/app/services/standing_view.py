"""Builds the standing a player sees once their day is over."""

import math

from app.schemas.standing import LevelScoreView, ScoreCurveView, StandingView
from app.services.standing_service import DayStanding


def build_standing_view(result: DayStanding) -> StandingView:
    standing = result.standing
    return StandingView(
        day=result.day,
        day_number=result.day_number,
        levels=[
            LevelScoreView(
                level=level.level,
                filed=level.filed,
                seconds=level.seconds,
                hints=level.hints,
                strikes=level.strikes,
                hint_penalty_seconds=level.hint_penalty_seconds,
                strike_penalty_seconds=level.strike_penalty_seconds,
                total_seconds=level.total_seconds,
            )
            for level in result.score.levels
        ],
        total_seconds=result.score.total_seconds,
        players=standing.players,
        ahead_of=standing.ahead_of,
        top_percent=top_percent(standing.players, standing.ahead_of),
        beat_percent=beat_percent(standing.players, standing.ahead_of),
        further_percent=beat_percent(
            standing.players, sum(standing.reached[: standing.levels_filed])
        ),
        comparable=result.comparable,
        levels_filed=standing.levels_filed,
        score_seconds=standing.score_seconds,
        reached=list(standing.reached),
        curve=ScoreCurveView(
            low_seconds=standing.curve.low_seconds,
            high_seconds=standing.curve.high_seconds,
            counts=list(standing.curve.counts),
        ),
    )


def top_percent(players: int, ahead_of: int) -> int:
    """The smallest top N% that includes you: first of 100 is top 1%. Ties count against you."""
    rank = players - ahead_of
    return max(1, math.ceil(100 * rank / players))


def beat_percent(players: int, ahead_of: int) -> int:
    """The share of the other players you beat outright, rounded down. With `ahead_of` counting
    only players who filed fewer levels, it is the share you got further than."""
    if players <= 1:
        return 0
    return math.floor(100 * ahead_of / (players - 1))
