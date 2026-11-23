"""Domain errors. Their messages are written for players and are safe to return to the client."""

from typing import ClassVar

from app.models.hint import HintKind


class DomainError(Exception):
    """Base for errors caused by a request the rules refuse, as opposed to bugs."""


class UnknownLevelError(DomainError):
    def __init__(self, level_id: int) -> None:
        super().__init__(f"There is no level {level_id}.")


class DayNotOpenError(DomainError):
    def __init__(self) -> None:
        super().__init__("Those records are not open.")


class InvalidMoveError(DomainError):
    """The move doesn't fit the cell, the record's state or the day's progress."""


class DayNotOverError(InvalidMoveError):
    def __init__(self) -> None:
        super().__init__("Your standing is ready once your day is over.")


class RankingsUnavailableError(DomainError):
    """Standings can't be recorded or read now: Supabase is unreachable or not configured."""

    def __init__(self) -> None:
        super().__init__("Rankings are unavailable right now. Try again later.")


class HintsSpentError(InvalidMoveError):
    _NAMES: ClassVar[dict[HintKind, str]] = {
        HintKind.OPEN: "Open",
        HintKind.CAMERA: "Camera",
        HintKind.SAFE: "Safe cell",
    }

    def __init__(self, kind: HintKind) -> None:
        super().__init__(
            f"You have used today's {self._NAMES[kind]} hint. "
            "New hints come with tomorrow's records."
        )


class GameOverError(InvalidMoveError):
    def __init__(self) -> None:
        super().__init__("That record is closed.")
