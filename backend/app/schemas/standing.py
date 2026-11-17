"""Shapes for a finished day's score and how it compares with everyone else's."""

from datetime import date

from app.schemas.base import ApiModel


class LevelScoreView(ApiModel):
    level: int
    filed: bool
    seconds: int
    hints: int
    strikes: int
    hint_penalty_seconds: int
    strike_penalty_seconds: int
    total_seconds: int


class ScoreCurveView(ApiModel):
    """Equal-width bins of adjusted time, from `low_seconds` to `high_seconds`, for the players
    who filed as many levels as you."""

    low_seconds: int
    high_seconds: int
    counts: list[int]


class StandingView(ApiModel):
    """Your finished day and its place among everyone who has finished the same day so far.

    `levels` and `total_seconds` are this day as played; `score_seconds` and `levels_filed` are
    the result the ranking used (the first one recorded). `reached[n]` is how many players filed
    exactly n levels. `comparable` is false until enough players have finished to compare.
    """

    day: date
    day_number: int
    levels: list[LevelScoreView]
    total_seconds: int
    players: int
    ahead_of: int
    top_percent: int
    beat_percent: int
    further_percent: int
    comparable: bool
    levels_filed: int
    score_seconds: int
    reached: list[int]
    curve: ScoreCurveView
