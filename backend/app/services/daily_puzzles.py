"""The daily records: derived from the date, identical for every player, built once and cached.

No scheduler or database is needed: any server holding the same salt computes the same four records
for a day. The salt is secret so nobody can generate tomorrow's records (and their solutions) ahead
of time. Building a level IV record can take several seconds, so the book is warmed in the
background before players ask for it.
"""

import hashlib
from datetime import date
from threading import Lock

from app.models.board_spec import BoardSpec
from app.models.daily import DailyPuzzle
from app.models.level import Level
from app.services.levels import get_level
from app.services.puzzle.generator import PuzzleGenerationError, generate_puzzle
from app.services.puzzle.grading import grade_puzzle
from app.services.puzzle.rng import Random, make_rng, pick

# Record numbers are generation seeds, shown to players as five digits.
RECORD_NUMBER_MIN = 10_000
RECORD_NUMBER_MAX = 99_999
_MAX_CANDIDATES = 300


def daily_seed(salt: str, day: date, level_id: int) -> int:
    """A 32-bit seed for the level's record on `day`. Unpredictable without the salt."""
    digest = hashlib.sha256(f"{salt}:{day.isoformat()}:{level_id}".encode()).digest()
    return int.from_bytes(digest[:4], "big")


def build_daily_puzzle(level: Level, day: date, salt: str) -> DailyPuzzle:
    """Draw boards from the level's ranges until one grades inside its band."""
    rand = make_rng(daily_seed(salt, day, level.id))
    for _ in range(_MAX_CANDIDATES):
        spec = _draw_spec(level, rand)
        record_no = RECORD_NUMBER_MIN + int(rand() * (RECORD_NUMBER_MAX - RECORD_NUMBER_MIN + 1))
        try:
            puzzle = generate_puzzle(spec, record_no)
        except PuzzleGenerationError:
            # Some drawn layouts can't host a fair record; the next candidate is drawn instead.
            continue
        grade = grade_puzzle(puzzle.board, puzzle.clues)
        if level.band.admits(grade):
            return DailyPuzzle(day=day, level=level.id, puzzle=puzzle, grade=grade)
    raise PuzzleGenerationError(f"No level {level.id} record in band for {day.isoformat()}.")


def _draw_spec(level: Level, rand: Random) -> BoardSpec:
    rows, cols = pick(level.sizes, rand)
    return BoardSpec(
        rows=rows,
        cols=cols,
        walls=_draw(level.walls.low, level.walls.high, rand),
        cameras=_draw(level.cameras.low, level.cameras.high, rand),
        lies=level.lies,
        starting_clues=2,
        min_clues_per_row=level.min_clues_per_row,
        max_hard_rounds=level.max_hard_rounds,
    )


def _draw(low: int, high: int, rand: Random) -> int:
    return low + int(rand() * (high - low + 1))


class DailyPuzzleBook:
    """Thread-safe cache of built daily records. Each record is built at most once per process,
    even when several requests (or the warmer) ask for it at the same moment."""

    def __init__(self, salt: str) -> None:
        self._salt = salt
        self._ready: dict[tuple[date, int], DailyPuzzle] = {}
        self._building: dict[tuple[date, int], Lock] = {}
        self._guard = Lock()

    def get(self, day: date, level_id: int) -> DailyPuzzle:
        key = (day, level_id)
        with self._guard:
            ready = self._ready.get(key)
            if ready is not None:
                return ready
            building = self._building.setdefault(key, Lock())
        with building:
            with self._guard:
                ready = self._ready.get(key)
            if ready is not None:
                return ready
            built = build_daily_puzzle(get_level(level_id), day, self._salt)
            with self._guard:
                self._ready[key] = built
                self._building.pop(key, None)
            return built

    def forget_before(self, day: date) -> None:
        """Drop records older than `day`; nobody can play them any more."""
        with self._guard:
            for key in [k for k in self._ready if k[0] < day]:
                del self._ready[key]
