from dataclasses import replace
from typing import Any

import pytest

from app.models.board_spec import BoardSpec
from app.models.puzzle import Puzzle
from app.services.puzzle.generator import PuzzleGenerationError, generate_puzzle, simulate
from tests.factories import TELESCREENS_SPECS

# Records that generate quickly, covering every original spec.
SAMPLE_RECORDS = [(1, 4127), (2, 31337), (3, 31337), (3, 99999), (4, 4096)]


@pytest.fixture(scope="module")
def samples() -> list[tuple[BoardSpec, Puzzle]]:
    return [
        (TELESCREENS_SPECS[spec_id], generate_puzzle(TELESCREENS_SPECS[spec_id], seed))
        for spec_id, seed in SAMPLE_RECORDS
    ]


def test_generation_matches_the_js_engine(js_engine: dict[str, Any]) -> None:
    for case in js_engine["records"]:
        puzzle = generate_puzzle(TELESCREENS_SPECS[case["chapter"]], case["recordNo"])
        board = puzzle.board
        label = f"chapter {case['chapter']} record {case['recordNo']}"
        assert [i for i, w in enumerate(board.walls) if w] == case["walls"], label
        assert [i for i, c in enumerate(board.cameras) if c] == case["cameras"], label
        clues = [{"cell": c.cell, "shown": c.shown, "liar": c.liar} for c in puzzle.clues]
        assert clues == case["clues"], label


def test_generation_is_deterministic() -> None:
    spec = TELESCREENS_SPECS[3]
    assert generate_puzzle(spec, 2024) == generate_puzzle(spec, 2024)


def test_records_match_their_spec(samples: list[tuple[BoardSpec, Puzzle]]) -> None:
    for spec, puzzle in samples:
        board = puzzle.board
        assert (board.rows, board.cols) == (spec.rows, spec.cols)
        assert sum(board.walls) == spec.walls
        assert board.camera_count == spec.cameras
        assert board.lies is spec.lies
        assert all(not board.walls[c.cell] and not board.cameras[c.cell] for c in puzzle.clues)


def test_records_are_solvable_without_guessing_within_the_cap(
    samples: list[tuple[BoardSpec, Puzzle]],
) -> None:
    for spec, puzzle in samples:
        sim = simulate(puzzle.board, puzzle.clues)
        assert sim.solved
        assert sim.hard_rounds <= spec.max_hard_rounds


def test_honest_clues_show_the_truth_and_liars_are_off_by_one(
    samples: list[tuple[BoardSpec, Puzzle]],
) -> None:
    for _, puzzle in samples:
        truth = puzzle.board.truth
        for clue in puzzle.clues:
            true_count = truth[clue.cell]
            expected = {true_count - 1, true_count + 1} if clue.liar else {true_count}
            assert clue.shown in expected


def test_lie_boards_have_exactly_one_liar_per_row(
    samples: list[tuple[BoardSpec, Puzzle]],
) -> None:
    for _, puzzle in samples:
        if not puzzle.board.lies:
            assert not any(c.liar for c in puzzle.clues)
            continue
        cols = puzzle.board.cols
        for row in range(puzzle.board.rows):
            in_row = [c for c in puzzle.clues if c.cell // cols == row]
            assert in_row, f"row {row} has no Party record"
            assert sum(c.liar for c in in_row) == 1


def test_impossible_spec_raises_instead_of_returning_a_bad_record() -> None:
    # A lie board needs two safe cells per row; a 1x2 board with a camera never has them.
    impossible = replace(TELESCREENS_SPECS[3], rows=1, cols=2, walls=0, cameras=1)
    with pytest.raises(PuzzleGenerationError):
        generate_puzzle(impossible, 1)
