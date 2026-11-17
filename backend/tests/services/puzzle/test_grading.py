import pytest

from app.models.grade import Grade
from app.models.puzzle import Clue
from app.services.puzzle.grading import UngradableRecordError, grade_puzzle
from tests.factories import make_puzzle


def test_a_single_full_number_is_a_direct_step() -> None:
    puzzle = make_puzzle(["C."], clues=[1])

    assert grade_puzzle(puzzle.board, puzzle.clues) == Grade(direct=1, combined=0, deep=0)


def test_needing_the_camera_total_is_a_combined_step() -> None:
    # The zero behind the wall sees nothing, so only the total (one camera) settles cell 0.
    puzzle = make_puzzle(["C#."], clues=[2])

    assert grade_puzzle(puzzle.board, puzzle.clues) == Grade(direct=0, combined=1, deep=0)


def test_seeing_through_a_party_lie_by_contradiction_is_a_deep_step() -> None:
    # The lone Party record shows 1 but must be false; only a hypothesis shows it is really 0.
    puzzle = make_puzzle(["C.", ".."], clues=[Clue(3, 1, liar=True)], lies=True)

    assert grade_puzzle(puzzle.board, puzzle.clues) == Grade(direct=0, combined=0, deep=1)


def test_a_record_that_needs_guessing_is_refused() -> None:
    puzzle = make_puzzle(["C.."], clues=[2])

    with pytest.raises(UngradableRecordError):
        grade_puzzle(puzzle.board, puzzle.clues)
