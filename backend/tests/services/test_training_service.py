import pytest

from app.models.game import ClearOutcome, GameStatus
from app.models.hint import HintKind, NoHint
from app.services.errors import InvalidMoveError, UnknownLevelError
from app.services.training_records import training_record
from app.services.training_service import TrainingService, new_training_store
from tests.factories import FakeClock


def _service() -> TrainingService:
    return TrainingService(new_training_store(capacity=10), clock=FakeClock())


def _cameras(level: int) -> list[int]:
    board = training_record(level).puzzle.board
    return [cell for cell in range(board.size) if board.cameras[cell]]


def test_start_deals_a_fresh_game_of_the_training_record() -> None:
    game = _service().start("p", 1)

    assert game.puzzle == training_record(1).puzzle
    assert game.status is GameStatus.PLAY
    assert not game.cleared
    assert not game.marks


def test_a_move_before_starting_is_refused() -> None:
    with pytest.raises(InvalidMoveError):
        _service().mark("p", 1, 0)


def test_an_unknown_level_is_refused() -> None:
    with pytest.raises(UnknownLevelError):
        _service().start("p", 9)


def test_clearing_a_camera_is_a_strike_and_three_lose_the_record() -> None:
    service = _service()
    service.start("p", 1)
    first, second, third, *_ = _cameras(1)

    game, outcome = service.clear("p", 1, first)
    assert outcome is ClearOutcome.SEEN
    assert game.strikes == 1
    service.clear("p", 1, second)
    game, _ = service.clear("p", 1, third)

    assert game.status is GameStatus.LOST


def test_starting_again_replaces_a_lost_game() -> None:
    service = _service()
    service.start("p", 1)
    for camera in _cameras(1)[:3]:
        service.clear("p", 1, camera)

    game = service.start("p", 1)

    assert game.status is GameStatus.PLAY
    assert game.strikes == 0


def test_games_are_kept_per_player_and_level() -> None:
    service = _service()
    service.start("p", 1)
    service.start("p", 2)
    service.start("q", 1)

    service.mark("p", 1, _cameras(1)[0])

    assert service.mark("p", 2, _cameras(2)[0]).marks == {_cameras(2)[0]}
    assert service.mark("q", 1, _cameras(1)[1]).marks == {_cameras(1)[1]}


def test_hints_in_training_are_unlimited() -> None:
    service = _service()
    service.start("p", 2)

    hints = [service.hint("p", 2, kind) for kind in (HintKind.CAMERA, HintKind.SAFE) * 3]
    service.open("p", 2, _cameras(2)[0])
    game, _ = service.open("p", 2, _cameras(2)[1])

    assert not any(isinstance(hint, NoHint) for _, hint in hints)
    assert game.hints == 8
    assert game.strikes == 0
