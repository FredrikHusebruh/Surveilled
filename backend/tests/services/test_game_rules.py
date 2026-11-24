import pytest

from app.models.game import MAX_STRIKES, ClearOutcome, GameStatus, OpenOutcome
from app.models.hint import HintKind, NoHint
from app.models.puzzle import Clue
from app.services.errors import GameOverError, InvalidMoveError
from app.services.game_rules import clear_cell, open_cell, take_hint, toggle_mark, toggle_stamp
from tests.factories import START_TIME, make_game, make_puzzle

# Camera in the corner. Row 0 and column 0 see it (count 1); the other four cells are zeros.
CORNER = ["C..", "...", "..."]


def test_clearing_a_numbered_cell_reveals_only_that_cell() -> None:
    game = make_game(make_puzzle(CORNER))

    after, outcome = clear_cell(game, 1, START_TIME)

    assert outcome is ClearOutcome.CLEARED
    assert after.cleared == {1}
    assert after.status is GameStatus.PLAY


def test_moves_never_mutate_the_game_they_are_given() -> None:
    game = make_game(make_puzzle(CORNER))

    clear_cell(game, 1, START_TIME)
    toggle_mark(game, 0)

    assert game.cleared == frozenset()
    assert game.marks == frozenset()


def test_a_zero_cascades_but_skips_given_and_marked_cells() -> None:
    game = make_game(make_puzzle(CORNER, clues=[2]), marks=frozenset({3}))

    after, outcome = clear_cell(game, 8, START_TIME)

    assert outcome is ClearOutcome.CASCADE
    assert after.cleared == {1, 4, 5, 6, 7, 8}
    assert after.status is GameStatus.PLAY


def test_clearing_every_safe_cell_files_the_record() -> None:
    game = make_game(make_puzzle(["C.."]))

    game, _ = clear_cell(game, 1, START_TIME)
    game, _ = clear_cell(game, 2, START_TIME + 42)

    assert game.status is GameStatus.WON
    assert game.finished_at == START_TIME + 42
    assert game.elapsed_seconds(now=START_TIME + 999) == 42


def test_clearing_a_camera_is_a_strike_and_the_last_strike_loses() -> None:
    game = make_game(make_puzzle(["CCC."]))

    for cell in range(MAX_STRIKES):
        game, outcome = clear_cell(game, cell, START_TIME + cell)
        assert outcome is ClearOutcome.SEEN
        assert game.strikes == cell + 1

    assert game.status is GameStatus.LOST
    assert game.finished_at == START_TIME + MAX_STRIKES - 1


@pytest.mark.parametrize(
    ("cell", "message"),
    [(1, "wall"), (2, "already revealed"), (9, "not on the record"), (-1, "not on the record")],
)
def test_clear_refuses_cells_that_are_not_hidden(cell: int, message: str) -> None:
    game = make_game(make_puzzle(["C#.."], clues=[2]))

    with pytest.raises(InvalidMoveError, match=message):
        clear_cell(game, cell, START_TIME)


def test_clear_refuses_a_marked_cell() -> None:
    game = make_game(make_puzzle(["C.."]), marks=frozenset({1}))

    with pytest.raises(InvalidMoveError, match="marked"):
        clear_cell(game, 1, START_TIME)


def test_no_moves_after_the_record_closes() -> None:
    game = make_game(make_puzzle(["C.."]), status=GameStatus.WON)

    with pytest.raises(GameOverError):
        clear_cell(game, 1, START_TIME)
    with pytest.raises(GameOverError):
        toggle_mark(game, 1)
    with pytest.raises(GameOverError):
        take_hint(game, HintKind.SAFE)
    with pytest.raises(GameOverError):
        open_cell(game, 1, START_TIME)


def test_toggle_mark_adds_and_removes_a_mark() -> None:
    game = make_game(make_puzzle(["C.."]))

    marked = toggle_mark(game, 0)
    unmarked = toggle_mark(marked, 0)

    assert marked.marks == {0}
    assert unmarked.marks == frozenset()


def test_toggle_mark_refuses_revealed_cells() -> None:
    game = make_game(make_puzzle(["C.."], clues=[2]), cleared=frozenset({1}))

    for cell in (1, 2):
        with pytest.raises(InvalidMoveError):
            toggle_mark(game, cell)


def test_toggle_stamp_works_only_on_party_records() -> None:
    party = make_puzzle(["C..", "..."], clues=[Clue(2, 2, liar=True)], lies=True)
    honest = make_puzzle(["C.."], clues=[2])

    assert toggle_stamp(make_game(party), 2).stamps == {2}
    with pytest.raises(InvalidMoveError, match="Party records"):
        toggle_stamp(make_game(party), 1)
    with pytest.raises(InvalidMoveError, match="Party records"):
        toggle_stamp(make_game(honest), 2)


def test_a_hint_is_counted_by_kind_even_when_it_finds_nothing() -> None:
    useful = make_game(make_puzzle(["C."], clues=[1]))
    all_marked = make_game(make_puzzle(["C."], clues=[1]), marks=frozenset({0}))

    after_useful, _ = take_hint(useful, HintKind.CAMERA)
    after_nothing, hint = take_hint(all_marked, HintKind.CAMERA)

    assert after_useful.hints_used == (HintKind.CAMERA,)
    assert after_useful.hints == 1
    assert isinstance(hint, NoHint)
    assert after_nothing.hints_used == (HintKind.CAMERA,)


def test_open_is_not_taken_as_a_plain_hint() -> None:
    with pytest.raises(InvalidMoveError):
        take_hint(make_game(make_puzzle(["C.."])), HintKind.OPEN)


def test_open_marks_a_camera_without_a_strike() -> None:
    game, outcome = open_cell(make_game(make_puzzle(["C..", "..."])), 0, START_TIME)

    assert outcome is OpenOutcome.MARKED
    assert game.marks == {0}
    assert game.strikes == 0
    assert game.hints_used == (HintKind.OPEN,)


def test_open_clears_a_safe_cell_and_a_zero_cascades() -> None:
    puzzle = make_puzzle(["C..", "...", ".#."])
    shown, shown_outcome = open_cell(make_game(puzzle), 1, START_TIME)
    zero, zero_outcome = open_cell(make_game(puzzle), 8, START_TIME)

    assert shown_outcome is OpenOutcome.CLEARED
    assert shown.cleared == {1}
    assert zero_outcome is OpenOutcome.CASCADE
    assert {5, 8} <= zero.cleared


def test_open_clears_a_wrongly_marked_safe_cell() -> None:
    game = make_game(make_puzzle(["C..", "..."]), marks=frozenset({1}))

    opened, outcome = open_cell(game, 1, START_TIME)

    assert outcome is OpenOutcome.CLEARED
    assert 1 in opened.cleared
    assert opened.marks == frozenset()


def test_open_refuses_a_revealed_cell() -> None:
    game = make_game(make_puzzle(["C..", "..."], clues=[2]), cleared=frozenset({1}))

    for cell in (1, 2):
        with pytest.raises(InvalidMoveError):
            open_cell(game, cell, START_TIME)


def test_opening_the_last_safe_cell_files_the_record() -> None:
    game = make_game(make_puzzle(["C.."], clues=[2]))

    opened, _ = open_cell(game, 1, START_TIME)

    assert opened.status is GameStatus.WON
