"""The scoring rule: adjusted time, like golf. Your clock, plus a fixed penalty per hint and per
strike. Lower is better. Changing a penalty changes how days compare, so only change it between
days, never during one."""

from app.models.daily import DailyRun, RunOutcome
from app.models.game import Game, GameStatus
from app.models.standing import DayScore, LevelScore

HINT_PENALTY_SECONDS = 30
STRIKE_PENALTY_SECONDS = 60


def level_score(level: int, game: Game) -> LevelScore:
    """The adjusted time of a closed record. Raises for a record still in play."""
    if game.finished_at is None or game.status is GameStatus.PLAY:
        raise ValueError(f"Level {level} is still in play, so it has no score yet.")
    return LevelScore(
        level=level,
        filed=game.status is GameStatus.WON,
        seconds=game.elapsed_seconds(game.finished_at),
        hints=game.hints,
        strikes=game.strikes,
        hint_penalty_seconds=game.hints * HINT_PENALTY_SECONDS,
        strike_penalty_seconds=game.strikes * STRIKE_PENALTY_SECONDS,
    )


def day_score(run: DailyRun) -> DayScore:
    """The score of a finished day: every level played, the one that ended it included. Raises
    while the day is still being played."""
    if run.outcome is RunOutcome.PLAYING:
        raise ValueError("The day is still being played, so it has no score yet.")
    return DayScore(
        levels=tuple(
            level_score(level, game)
            for level, game in enumerate(run.games, start=1)
            if game is not None
        )
    )
