import pytest

from app.models.puzzle import Clue
from app.services.puzzle.solver import (
    CAMERA,
    SAFE,
    UNKNOWN,
    Deduction,
    InconsistentBoardError,
    find_forced,
)
from tests.factories import make_board


def test_propagation_alone_proves_an_exact_number() -> None:
    board = make_board(["C."])
    known = [UNKNOWN, SAFE]

    result = find_forced(board, [Clue(1, 1, liar=False)], known)

    assert result.deductions == (Deduction(0, is_camera=True),)
    assert result.hard is False


def test_search_proves_cells_behind_a_party_record() -> None:
    # The lone Party record shows 1 but must be false: 0 or 2. Two cameras would exceed the
    # board's single camera, so it is 0. Propagation can't see that; search can.
    board = make_board(["C.", ".."], lies=True)
    known = [UNKNOWN, UNKNOWN, UNKNOWN, SAFE]

    result = find_forced(board, [Clue(3, 1, liar=True)], known)

    assert result.hard is True
    assert set(result.deductions) == {
        Deduction(0, is_camera=True),
        Deduction(1, is_camera=False),
        Deduction(2, is_camera=False),
    }


def test_returns_no_deductions_when_nothing_is_provable() -> None:
    board = make_board(["C.."])
    known = [UNKNOWN, UNKNOWN, SAFE]

    result = find_forced(board, [Clue(2, 1, liar=False)], known)

    assert result.deductions == ()


def test_contradictory_knowledge_raises() -> None:
    board = make_board(["C."])
    known = [SAFE, SAFE]

    with pytest.raises(InconsistentBoardError):
        find_forced(board, [Clue(1, 1, liar=False)], known)


def test_known_cameras_count_towards_numbers() -> None:
    board = make_board(["C.C"])
    known = [CAMERA, SAFE, UNKNOWN]

    result = find_forced(board, [Clue(1, 2, liar=False)], known)

    assert result.deductions == (Deduction(2, is_camera=True),)
