import pytest

from app.models.game import GameStatus
from app.models.hint import ClueHint, DeductionHint, NoHint, WrongMarkHint
from app.models.puzzle import Clue
from app.services.hints import find_hint
from app.services.puzzle.generator import generate_puzzle
from tests.factories import TELESCREENS_SPECS, make_game, make_puzzle
from tests.playthrough import play_by_hints


def test_wrong_marks_come_first() -> None:
    game = make_game(make_puzzle(["C."], clues=[1]), marks=frozenset({0}))
    wrong = make_game(make_puzzle(["C.."], clues=[1]), marks=frozenset({2}))

    assert not isinstance(find_hint(game), WrongMarkHint)
    assert find_hint(wrong) == WrongMarkHint(2)


def test_a_satisfied_number_proves_its_hidden_cells_safe() -> None:
    # The zero at cell 5 sees cells 2, 4 and 3, so all three are safe.
    game = make_game(make_puzzle(["C..", "..."], clues=[5]))

    assert find_hint(game) == ClueHint(
        clue_cell=5, cell=2, is_camera=False, clue_value=0, cameras_seen=0, hidden_seen=3
    )


def test_a_full_number_proves_its_hidden_cells_are_cameras() -> None:
    game = make_game(make_puzzle(["C."], clues=[1]))

    assert find_hint(game) == ClueHint(
        clue_cell=1, cell=0, is_camera=True, clue_value=1, cameras_seen=0, hidden_seen=1
    )


def test_party_records_are_never_trusted_on_their_own() -> None:
    # The Party record shows 1 but must be false; only search can prove its cells safe.
    game = make_game(make_puzzle(["C.", ".."], clues=[Clue(3, 1, liar=True)], lies=True))

    hint = find_hint(game)

    assert isinstance(hint, DeductionHint)
    assert hint.cell in {1, 2}
    assert hint.is_camera is False


def test_no_hint_when_nothing_can_be_proven() -> None:
    game = make_game(make_puzzle(["C.."], clues=[2]))

    assert find_hint(game) == NoHint()


@pytest.mark.parametrize(("spec_id", "record_no"), [(1, 4127), (2, 31337), (3, 31337), (4, 4096)])
def test_following_hints_alone_files_generated_records_without_strikes(
    spec_id: int, record_no: int
) -> None:
    puzzle = generate_puzzle(TELESCREENS_SPECS[spec_id], record_no)

    final = play_by_hints(make_game(puzzle))

    assert final.status is GameStatus.WON
    assert final.strikes == 0
