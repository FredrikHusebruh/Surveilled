"""Play a record by following hints only, failing loudly if a hint is ever wrong."""

import pytest

from app.models.game import ClearOutcome, Game, GameStatus
from app.models.hint import ClueHint, DeductionHint, NoHint, WrongMarkHint
from app.services.game_rules import clear_cell, take_hint, toggle_mark
from tests.factories import START_TIME


def play_by_hints(game: Game) -> Game:
    """Follow hints until the record closes. Fails if a hint ever sends the player onto a camera."""
    for _ in range(200):
        if game.status is not GameStatus.PLAY:
            return game
        game, hint = take_hint(game)
        match hint:
            case WrongMarkHint(cell=cell):
                game = toggle_mark(game, cell)
            case ClueHint(cell=cell, is_camera=True) | DeductionHint(cell=cell, is_camera=True):
                game = toggle_mark(game, cell)
            case ClueHint(cell=cell) | DeductionHint(cell=cell):
                game, outcome = clear_cell(game, cell, START_TIME)
                assert outcome is not ClearOutcome.SEEN, f"hint called camera {cell} safe"
            case NoHint():
                pytest.fail("hints ran out before the record was filed")
    pytest.fail("record not filed within 200 hints")
