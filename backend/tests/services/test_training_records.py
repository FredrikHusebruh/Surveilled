"""The hand-drawn training records: small, solved without guessing, every guided move right."""

from collections import Counter

import pytest

from app.models.game import ClearOutcome, Game, GameStatus
from app.models.hint import ClueHint, DeductionHint
from app.models.training import GuideAction, TrainingRecord
from app.services.errors import UnknownLevelError
from app.services.game_rules import clear_cell, toggle_mark, toggle_stamp
from app.services.hints import find_hint
from app.services.puzzle.grading import grade_puzzle
from app.services.training_records import TRAINING_LEVELS, training_record
from tests.factories import START_TIME
from tests.playthrough import play_by_hints


def _fresh(record: TrainingRecord) -> Game:
    return Game(puzzle=record.puzzle, rating=record.rating, started_at=START_TIME)


def _after_guides(record: TrainingRecord) -> Game:
    """Play the guided moves the way the player is asked to, checking each one is right."""
    game = _fresh(record)
    board = record.puzzle.board
    for guide in record.guides:
        cell = guide.cell
        match guide.action:
            case GuideAction.SELECT:
                numbered = record.puzzle.clue_at(cell) is not None or cell in game.cleared
                assert numbered, f"guide selects cell {cell}, which shows no number"
            case GuideAction.CLEAR:
                assert not board.cameras[cell], f"guide clears camera {cell}"
                game, outcome = clear_cell(game, cell, START_TIME)
                assert outcome is not ClearOutcome.SEEN
            case GuideAction.MARK:
                assert board.cameras[cell], f"guide marks safe cell {cell}"
                game = toggle_mark(game, cell)
            case GuideAction.STAMP:
                clue = record.puzzle.clue_at(cell)
                assert clue is not None, f"guide stamps {cell}, which is not a Party record"
                assert clue.liar, f"guide stamps {cell}, which is a true record"
                game = toggle_stamp(game, cell)
        assert game.status is GameStatus.PLAY, "a guided move must leave something to play"
    return game


@pytest.mark.parametrize("level", TRAINING_LEVELS)
def test_each_training_is_a_small_record(level: int) -> None:
    board = training_record(level).puzzle.board

    assert (board.rows, board.cols) == (5, 5)
    assert board.camera_count >= 3


@pytest.mark.parametrize("level", TRAINING_LEVELS)
def test_each_training_is_filed_by_hints_alone_after_its_guided_moves(level: int) -> None:
    record = training_record(level)

    assert play_by_hints(_after_guides(record)).status is GameStatus.WON


@pytest.mark.parametrize("level", TRAINING_LEVELS)
def test_false_party_records_follow_the_one_per_row_rule(level: int) -> None:
    puzzle = training_record(level).puzzle
    rows_with_clues = {clue.cell // puzzle.board.cols for clue in puzzle.clues}
    liars_by_row = Counter(clue.cell // puzzle.board.cols for clue in puzzle.clues if clue.liar)

    for clue in puzzle.clues:
        assert abs(clue.shown - puzzle.board.truth[clue.cell]) == (1 if clue.liar else 0)
    if puzzle.board.lies:
        assert all(liars_by_row[row] == 1 for row in rows_with_clues)
    else:
        assert not liars_by_row


def test_training_difficulty_rises_with_the_level() -> None:
    grades = {
        level: grade_puzzle(r.puzzle.board, r.puzzle.clues)
        for level in TRAINING_LEVELS
        for r in [training_record(level)]
    }

    assert grades[1].combined == grades[1].deep == 0, "basics need single numbers only"
    assert grades[2].deep == 0
    assert grades[2].combined >= 1, "walls need the camera count"
    assert grades[3].deep == 0
    assert grades[3].combined >= 1, "Party records need the lie rule"
    assert grades[4].deep >= 1, "combining needs numbers weighed together"


def test_training_one_teaches_the_zero_and_a_number_that_needs_every_hidden_cell() -> None:
    record = training_record(1)
    zero, clear, four, mark = record.guides
    board = record.puzzle.board

    assert board.truth[zero.cell] == 0
    assert clear.cell in board.sight[zero.cell], "the cleared cell is one the 0 proves safe"
    assert board.truth[clear.cell] == 0
    game, outcome = clear_cell(_fresh(record), clear.cell, START_TIME)
    assert outcome is ClearOutcome.CASCADE
    hint = find_hint(game)
    assert isinstance(hint, ClueHint)
    assert hint.is_camera
    assert hint.clue_cell == four.cell
    assert mark.cell in board.sight[four.cell]


def test_training_two_cuts_the_guided_line_short_with_a_wall() -> None:
    record = training_record(2)
    (guide,) = record.guides
    board = record.puzzle.board
    row = guide.cell // board.cols
    row_cells = range(row * board.cols, (row + 1) * board.cols)
    walls = [cell for cell in row_cells if board.walls[cell]]
    behind = [cell for cell in row_cells if cell < min(walls)] if walls else []

    assert walls, "a wall stands in the guided number's row"
    assert any(board.cameras[cell] for cell in behind), "a camera behind it would otherwise count"
    assert not set(behind) & set(board.sight[guide.cell])


def test_training_three_finds_a_lie_by_comparing_with_a_true_number() -> None:
    record = training_record(3)
    lone, clear, compared = record.guides
    puzzle = record.puzzle
    board = puzzle.board
    clue_cells = {clue.cell for clue in puzzle.clues}

    def hidden_in_line(cell: int) -> set[int]:
        return {seen for seen in board.sight[cell] if seen not in clue_cells | {clear.cell}}

    assert [c.cell for c in puzzle.clues if c.cell // board.cols == lone.cell // board.cols] == [
        lone.cell
    ], "the first lie is alone in its row"
    assert hidden_in_line(lone.cell) == set(), "one cell in line with it: the one to clear"
    assert clear.cell in board.sight[lone.cell]
    assert hidden_in_line(clear.cell) == hidden_in_line(compared.cell)
    clue = puzzle.clue_at(compared.cell)
    assert clue is not None
    assert clue.shown != board.truth[clear.cell], "the black number gives the red one away"


@pytest.mark.parametrize("level", TRAINING_LEVELS)
def test_no_party_record_is_false_at_a_glance(level: int) -> None:
    puzzle = training_record(level).puzzle
    clue_cells = {clue.cell for clue in puzzle.clues}

    for clue in puzzle.clues:
        hidden = [cell for cell in puzzle.board.sight[clue.cell] if cell not in clue_cells]
        assert clue.shown <= len(hidden), f"the {clue.shown} at {clue.cell} can't be true"


def test_training_four_opens_with_a_step_no_single_number_proves() -> None:
    record = training_record(4)
    first, second = record.guides

    assert isinstance(find_hint(_fresh(record)), DeductionHint)
    board = record.puzzle.board
    assert set(board.sight[first.cell]) & set(board.sight[second.cell])


def test_an_unknown_training_level_is_refused() -> None:
    with pytest.raises(UnknownLevelError):
        training_record(5)
