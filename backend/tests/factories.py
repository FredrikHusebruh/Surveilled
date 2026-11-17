"""Hand-drawn boards, records and games for tests.

Layouts are lists of equal-length rows: '#' is a wall, 'C' a camera and '.' an empty floor cell.
True counts and sight lines are derived the same way the generator derives them.
"""

from collections.abc import Sequence
from datetime import UTC, date, datetime
from typing import TypedDict, Unpack

from app.models.board_spec import BoardSpec
from app.models.daily import DailyPuzzle
from app.models.game import Game, GameStatus
from app.models.grade import Grade
from app.models.puzzle import Board, Clue, Puzzle
from app.services.puzzle.sight import compute_sight_lines

# Noon UTC on day 5 after launch, so the day before and after are open too.
LAUNCH_DAY = date(2026, 11, 16)
TODAY = date(2026, 11, 20)
START_TIME = datetime(2026, 11, 20, 12, tzinfo=UTC).timestamp()

# The original Telescreens engine's four chapters, used to check generator parity with it.
TELESCREENS_SPECS = {
    1: BoardSpec(
        5,
        5,
        walls=0,
        cameras=5,
        lies=False,
        starting_clues=2,
        min_clues_per_row=2,
        max_hard_rounds=0,
    ),
    2: BoardSpec(
        6,
        6,
        walls=7,
        cameras=7,
        lies=False,
        starting_clues=2,
        min_clues_per_row=2,
        max_hard_rounds=0,
    ),
    3: BoardSpec(
        7,
        6,
        walls=6,
        cameras=8,
        lies=True,
        starting_clues=2,
        min_clues_per_row=2,
        max_hard_rounds=1,
    ),
    4: BoardSpec(
        8,
        7,
        walls=10,
        cameras=12,
        lies=True,
        starting_clues=2,
        min_clues_per_row=1,
        max_hard_rounds=2,
    ),
}


def make_board(layout: Sequence[str], *, lies: bool = False) -> Board:
    rows, cols = len(layout), len(layout[0])
    cells = "".join(layout)
    walls = tuple(ch == "#" for ch in cells)
    cameras = tuple(ch == "C" for ch in cells)
    sight = compute_sight_lines(rows, cols, walls)
    truth = tuple(sum(cameras[j] for j in sight[i]) for i in range(rows * cols))
    return Board(rows, cols, walls, cameras, sight, truth, lies)


def make_puzzle(
    layout: Sequence[str],
    *,
    clues: Sequence[int | Clue] = (),
    lies: bool = False,
    seed: int = 12_345,
) -> Puzzle:
    """A puzzle on `layout`. Plain ints become honest clues showing the cell's true count."""
    board = make_board(layout, lies=lies)
    made = tuple(c if isinstance(c, Clue) else Clue(c, board.truth[c], liar=False) for c in clues)
    return Puzzle(seed, board, made)


def make_record(puzzle: Puzzle, *, day: date = TODAY, level: int = 1) -> DailyPuzzle:
    return DailyPuzzle(day=day, level=level, puzzle=puzzle, grade=Grade(3, 0, 0))


class GameChanges(TypedDict, total=False):
    """Fields of Game a test may preset."""

    cleared: frozenset[int]
    marks: frozenset[int]
    stamps: frozenset[int]
    exposed: frozenset[int]
    hints: int
    status: GameStatus
    finished_at: float | None


def make_game(puzzle: Puzzle, **changes: Unpack[GameChanges]) -> Game:
    return Game(puzzle=puzzle, rating=1, started_at=START_TIME, **changes)


class FakeClock:
    """A controllable clock for the daily service."""

    def __init__(self, now: float = START_TIME) -> None:
        self.now = now

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds
