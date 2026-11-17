"""Maps domain errors to HTTP responses. Anything unmapped is a bug and stays a generic 500."""

from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.services.errors import (
    DayNotOpenError,
    DomainError,
    InvalidMoveError,
    RankingsUnavailableError,
    UnknownLevelError,
)

_STATUS_BY_ERROR: dict[type[DomainError], int] = {
    UnknownLevelError: status.HTTP_404_NOT_FOUND,
    DayNotOpenError: status.HTTP_404_NOT_FOUND,
    InvalidMoveError: status.HTTP_409_CONFLICT,
    RankingsUnavailableError: status.HTTP_503_SERVICE_UNAVAILABLE,
}


def register_error_handlers(app: FastAPI) -> None:
    for error_type, code in _STATUS_BY_ERROR.items():
        app.add_exception_handler(error_type, _responder(code))


def _responder(code: int) -> Callable[[Request, Exception], Awaitable[JSONResponse]]:
    async def respond(_: Request, error: Exception) -> JSONResponse:
        return JSONResponse(status_code=code, content={"detail": str(error)})

    return respond
