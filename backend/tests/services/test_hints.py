import pytest

from app.models.game import GameStatus
from app.models.hint import ClueHint, DeductionHint, LocatedHint, NoHint, WrongMarkHint
from app.models.puzzle import Clue
from app.services.hints import find_camera_hint, find_hint, find_safe_hint
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


def test_the_camera_hint_prefers_a_camera_one_number_proves() -> None:
    # The 1 at cell 2 has one hidden cell in line (cell 1 is cleared): cell 0 must be the camera.
    game = make_game(make_puzzle(["C.."], clues=[2]), cleared=frozenset({1}))

    hint = find_camera_hint(game)

    assert isinstance(hint, ClueHint)
    assert hint.is_camera
    assert hint.cell == 0


def test_the_safe_hint_prefers_a_safe_cell_one_number_proves() -> None:
    # The 1 at cell 1 already counts its marked camera, so cell 2 is safe.
    game = make_game(make_puzzle(["C..", "###"], clues=[1]), marks=frozenset({0}))

    hint = find_safe_hint(game)

    assert isinstance(hint, ClueHint)
    assert not hint.is_camera
    assert hint.cell == 2


def test_hints_point_at_any_cell_of_their_kind_when_nothing_proves_one() -> None:
    game = make_game(make_puzzle(["C..", "..C"]))

    camera = find_camera_hint(game)
    safe = find_safe_hint(game)

    assert isinstance(camera, LocatedHint)
    assert camera.is_camera
    assert camera.cell in {0, 5}
    assert isinstance(safe, LocatedHint)
    assert not safe.is_camera
    assert safe.cell in {1, 2, 3, 4}


def test_the_safe_hint_points_out_a_wrong_mark_first() -> None:
    game = make_game(make_puzzle(["C..", "..."]), marks=frozenset({4}))

    assert find_safe_hint(game) == WrongMarkHint(4)


def test_the_camera_hint_points_out_a_wrong_mark_first() -> None:
    game = make_game(make_puzzle(["C..", ".C."], clues=[2]), marks=frozenset({3}))

    assert find_camera_hint(game) == WrongMarkHint(3)


def test_marking_every_other_cell_cannot_ask_the_camera_hint_where_the_cameras_are_not() -> None:
    # Marks on every hidden cell but one: had wrong marks been ignored, "nothing" would have
    # proved that last cell safe.
    game = make_game(make_puzzle(["C..", "..."]), marks=frozenset({0, 1, 2, 3, 4}))

    assert find_camera_hint(game) == WrongMarkHint(1)


def test_the_camera_hint_finds_nothing_once_every_camera_is_marked() -> None:
    game = make_game(make_puzzle(["C.."]), marks=frozenset({0}))

    assert isinstance(find_camera_hint(game), NoHint)
