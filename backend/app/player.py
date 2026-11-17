"""Anonymous player identity: a random id in an httpOnly cookie.

There are no accounts. The id only ties a browser to its daily runs so the server can enforce the
order of levels and the three-strikes rule. It is httpOnly, so page scripts (and any XSS) can't
read it, and SameSite=Lax, so other sites can't send moves on the player's behalf.
"""

import re
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, Request, Response

from app.config import Settings, get_settings

PLAYER_COOKIE = "sv_player"
_ID_PATTERN = re.compile(r"[0-9a-f]{32}")
_MAX_AGE_SECONDS = 400 * 24 * 60 * 60


def get_player_id(
    request: Request, response: Response, settings: Annotated[Settings, Depends(get_settings)]
) -> str:
    """The caller's player id. A missing or malformed cookie gets a fresh id, never a guess."""
    candidate = request.cookies.get(PLAYER_COOKIE)
    player_id = candidate if candidate and _ID_PATTERN.fullmatch(candidate) else uuid4().hex
    response.set_cookie(
        PLAYER_COOKIE,
        player_id,
        max_age=_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/api",
    )
    return player_id


PlayerDep = Annotated[str, Depends(get_player_id)]
