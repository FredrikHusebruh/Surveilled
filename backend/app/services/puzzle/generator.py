"""Puzzle generation: draws a board, deals clues, then grows and prunes them until a careful player
can solve the record without guessing, within the spec's difficulty cap."""

from collections.abc import Sequence
from dataclasses import dataclass

from app.models.board_spec import BoardSpec
from app.models.puzzle import Board, Clue, Puzzle
from app.services.puzzle.rng import Random, make_rng, pick, shuffled
from app.services.puzzle.sight import compute_sight_lines
from app.services.puzzle.solver import CAMERA, SAFE, UNKNOWN, find_forced

_MAX_ATTEMPTS = 200
_MAX_GROWTH = 80


class PuzzleGenerationError(Exception):
    """No acceptable record came out of the seed within the attempt budget."""


class UnsoundDeductionError(Exception):
    """The solver proved something false. This is a bug in the solver."""


@dataclass(frozen=True)
class Simulation:
    """How far a careful player gets from the starting clues alone.

    `known` is the player's final per-cell UNKNOWN/SAFE/CAMERA knowledge. `hard_rounds` counts the
    steps that needed search rather than reading off a single number.
    """

    solved: bool
    known: tuple[int, ...]
    hard_rounds: int


def generate_puzzle(spec: BoardSpec, seed: int) -> Puzzle:
    """The record for `spec` and `seed`. The same pair always produces the same record."""
    rand = make_rng(seed)
    for _ in range(_MAX_ATTEMPTS):
        board = _draw_board(spec, rand)
        if board is None:
            continue
        clues = _deal_clues(spec, board, rand)
        if clues is None:
            continue
        settled = _settle_clues(spec, board, clues, rand)
        if settled is None:
            continue
        return Puzzle(seed, board, settled)
    raise PuzzleGenerationError(f"No record found for {spec}, seed {seed}.")


def simulate(board: Board, clues: Sequence[Clue]) -> Simulation:
    """Play the record as a careful player who only acts on what can be proven."""
    known = [UNKNOWN] * board.size
    for clue in clues:
        known[clue.cell] = SAFE
    safe_total = len(board.safe_cells)
    revealed = len(clues)
    hard_rounds = 0
    while revealed < safe_total:
        result = find_forced(board, clues, known)
        if not result.deductions:
            return Simulation(False, tuple(known), hard_rounds)
        if result.hard:
            hard_rounds += 1
        for deduction in result.deductions:
            if known[deduction.cell] != UNKNOWN:
                continue
            if deduction.is_camera != board.cameras[deduction.cell]:
                raise UnsoundDeductionError(f"Solver misjudged cell {deduction.cell}.")
            known[deduction.cell] = CAMERA if deduction.is_camera else SAFE
            if not deduction.is_camera:
                revealed += 1
    return Simulation(True, tuple(known), hard_rounds)


def _draw_board(spec: BoardSpec, rand: Random) -> Board | None:
    """Place walls and cameras. None when a wall layout leaves a cell that sees nothing."""
    size = spec.rows * spec.cols
    wall_cells = set(shuffled(range(size), rand)[: spec.walls])
    walls = tuple(i in wall_cells for i in range(size))
    sight = compute_sight_lines(spec.rows, spec.cols, walls)
    if any(not walls[i] and not sight[i] for i in range(size)):
        return None
    floor = [i for i in range(size) if not walls[i]]
    camera_cells = set(shuffled(floor, rand)[: spec.cameras])
    cameras = tuple(i in camera_cells for i in range(size))
    truth = tuple(sum(cameras[j] for j in sight[i]) for i in range(size))
    return Board(spec.rows, spec.cols, walls, cameras, sight, truth, spec.lies)


def _deal_clues(spec: BoardSpec, board: Board, rand: Random) -> list[Clue] | None:
    """Starting clues. Lie boards get two per row, one of them false.

    None when a row has fewer than two safe cells, or neither pick can lie ambiguously.
    """
    safe = board.safe_cells
    if not spec.lies:
        picks = shuffled(safe, rand)[: spec.starting_clues]
        return [Clue(cell, board.truth[cell], liar=False) for cell in picks]

    clues: list[Clue] = []
    for row in range(board.rows):
        row_safe = [i for i in safe if i // board.cols == row]
        if len(row_safe) < 2:
            return None
        picks = shuffled(row_safe, rand)[:2]
        offsets = [_lie_offsets(board, cell) for cell in picks]
        can_lie = [k for k, options in enumerate(offsets) if options]
        if not can_lie:
            return None
        liar = pick(can_lie, rand)
        for k, cell in enumerate(picks):
            if k == liar:
                clues.append(Clue(cell, board.truth[cell] + pick(offsets[k], rand), liar=True))
            else:
                clues.append(Clue(cell, board.truth[cell], liar=False))
    return clues


def _lie_offsets(board: Board, cell: int) -> list[int]:
    """Lie offsets that stay ambiguous: the shown number could be the truth plus or minus one."""
    truth, reach = board.truth[cell], len(board.sight[cell])
    return [d for d in (-1, 1) if 1 <= truth + d <= reach - 1]


def _settle_clues(
    spec: BoardSpec, board: Board, dealt: list[Clue], rand: Random
) -> tuple[Clue, ...] | None:
    """Add honest clues where a careful player gets stuck, then drop the ones not needed.

    None when even 80 extra clues can't make the record solvable within the spec's cap.
    """
    cap = spec.max_hard_rounds

    def acceptable(sim: Simulation) -> bool:
        return sim.solved and sim.hard_rounds <= cap

    safe = board.safe_cells
    clues = list(dealt)
    sim = simulate(board, clues)
    grown = 0
    while not acceptable(sim) and grown < _MAX_GROWTH:
        grown += 1
        given = {clue.cell for clue in clues}
        if sim.solved:
            candidates = [i for i in safe if i not in given]
        else:
            candidates = [i for i in safe if sim.known[i] == UNKNOWN]
        if not candidates:
            break
        cell = pick(candidates, rand)
        clues = [*clues, Clue(cell, board.truth[cell], liar=False)]
        sim = simulate(board, clues)
    if not acceptable(sim):
        return None

    for clue in shuffled([c for c in clues if not c.liar], rand):
        if spec.lies:
            row = clue.cell // board.cols
            if sum(1 for c in clues if c.cell // board.cols == row) <= spec.min_clues_per_row:
                continue
        index = clues.index(clue)
        trial = clues[:index] + clues[index + 1 :]
        if acceptable(simulate(board, trial)):
            clues = trial

    final = simulate(board, clues)
    if not acceptable(final):
        return None
    return tuple(clues)
