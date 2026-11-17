"""Constraint solver: which hidden cells can be proven safe or a camera from what is known.

Each unknown cell is a boolean variable. Every known number is a constraint on the cells it sees:
an exact number must match its count, while a Party record (on boards with lies) belongs to a
row in which exactly one Party record is false, off by exactly one. A last constraint fixes the
total number of cameras. Propagation runs to a fixpoint; cells it can't settle are probed with a
bounded depth-first search.

The search keeps mutable state for speed, but it never escapes `find_forced`, which is pure.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from math import inf

from app.models.puzzle import Board, Clue

UNKNOWN, SAFE, CAMERA = -1, 0, 1
DEFAULT_NODE_LIMIT = 60_000

_EXACT, _PARTY = 0, 1
_MODE_EXACT, _MODE_HONEST, _MODE_LIE, _MODE_ANY = 0, 1, 2, 3


class InconsistentBoardError(Exception):
    """The known information contradicts itself. This is a bug: the truth always satisfies it."""


@dataclass(frozen=True)
class Deduction:
    cell: int
    is_camera: bool


@dataclass(frozen=True)
class ForcedCells:
    """Cells the known information proves. `hard` is True when finding them needed search."""

    deductions: tuple[Deduction, ...]
    hard: bool


@dataclass(frozen=True)
class _Constraint:
    variables: tuple[int, ...]
    base: int
    kind: int
    target: int
    row: int


@dataclass(frozen=True)
class _Model:
    cells: tuple[int, ...]
    constraints: tuple[_Constraint, ...]
    total_index: int


def find_forced(
    board: Board,
    clues: Sequence[Clue],
    known: Sequence[int],
    *,
    full: bool = False,
    node_limit: int = DEFAULT_NODE_LIMIT,
) -> ForcedCells:
    """Cells provable from `known`, a per-cell UNKNOWN/SAFE/CAMERA list.

    Returns the cells propagation alone proves when there are any. Otherwise, or when `full` is
    set, it also probes every remaining cell with search. A probe that hits `node_limit` leaves its
    cell unproven rather than guessing.
    """
    return _solve(_build_model(board, clues, known), node_limit, full)


def _build_model(board: Board, clues: Sequence[Clue], known: Sequence[int]) -> _Model:
    var_of = [-1] * board.size
    cells: list[int] = []
    for i in range(board.size):
        if not board.walls[i] and known[i] == UNKNOWN:
            var_of[i] = len(cells)
            cells.append(i)

    constraints: list[_Constraint] = []

    def add(cell: int, kind: int, target: int) -> None:
        variables: list[int] = []
        base = 0
        for j in board.sight[cell]:
            if known[j] == CAMERA:
                base += 1
            elif known[j] == UNKNOWN:
                variables.append(var_of[j])
        if kind == _EXACT and not variables:
            return
        constraints.append(_Constraint(tuple(variables), base, kind, target, cell // board.cols))

    given = {clue.cell for clue in clues}
    for clue in clues:
        add(clue.cell, _PARTY if board.lies else _EXACT, clue.shown)
    for i in range(board.size):
        if not board.walls[i] and known[i] == SAFE and i not in given:
            add(i, _EXACT, board.truth[i])

    known_cameras = sum(1 for value in known if value == CAMERA)
    total_index = len(constraints)
    constraints.append(
        _Constraint(tuple(range(len(cells))), known_cameras, _EXACT, board.camera_count, -1)
    )
    return _Model(tuple(cells), tuple(constraints), total_index)


def _solve(model: _Model, node_limit: int, full: bool) -> ForcedCells:
    constraints = model.constraints
    n_vars = len(model.cells)
    n_cons = len(constraints)

    cell_cons: list[list[int]] = [[] for _ in range(n_vars)]
    for k, con in enumerate(constraints):
        for v in con.variables:
            cell_cons[v].append(k)
    rows: dict[int, list[int]] = {}
    for k, con in enumerate(constraints):
        if con.kind == _PARTY:
            rows.setdefault(con.row, []).append(k)
    branch_cons = [k for k in range(n_cons) if k != model.total_index]

    val = [UNKNOWN] * n_vars
    ones = [con.base for con in constraints]
    unk = [len(con.variables) for con in constraints]
    trail: list[int] = []
    in_queue = [False] * n_cons
    queue: list[int] = []
    seen_safe = [False] * n_vars
    seen_camera = [False] * n_vars
    nodes = 0
    aborted = False

    def enqueue(k: int) -> None:
        if not in_queue[k]:
            in_queue[k] = True
            queue.append(k)

    def assign(x: int, v: int) -> None:
        val[x] = v
        trail.append(x)
        for k in cell_cons[x]:
            unk[k] -= 1
            if v:
                ones[k] += 1
            enqueue(k)

    def undo(mark: int) -> None:
        while len(trail) > mark:
            x = trail.pop()
            v = val[x]
            for k in cell_cons[x]:
                unk[k] += 1
                if v:
                    ones[k] -= 1
            val[x] = UNKNOWN

    def set_all(k: int, v: int) -> None:
        for x in constraints[k].variables:
            if val[x] == UNKNOWN:
                assign(x, v)

    def apply_set(k: int, mode: int) -> bool:
        a, u, s = ones[k], unk[k], constraints[k].target
        if mode in (_MODE_EXACT, _MODE_HONEST):
            candidates: tuple[int, ...] = (s,)
        elif mode == _MODE_LIE:
            candidates = (s - 1, s + 1)
        else:
            candidates = (s - 1, s, s + 1)
        low, high = inf, -inf
        for t in candidates:
            if t >= 0 and a <= t <= a + u:
                low = min(low, t)
                high = max(high, t)
        if low == inf:
            return False
        if u > 0:
            if high == a:
                set_all(k, SAFE)
            elif low == a + u:
                set_all(k, CAMERA)
        return True

    def process_row(row: int) -> bool:
        members = rows[row]
        must, must_count, candidate, candidate_count = -1, 0, -1, 0
        for k in members:
            a, u, s = ones[k], unk[k], constraints[k].target
            can_be_honest = a <= s <= a + u
            can_lie = (s - 1 >= 0 and a <= s - 1 <= a + u) or (a <= s + 1 <= a + u)
            if not can_be_honest and not can_lie:
                return False
            if not can_be_honest:
                must_count += 1
                must = k
            if can_lie:
                candidate_count += 1
                candidate = k
        if must_count > 1 or candidate_count == 0:
            return False
        liar = must if must_count == 1 else (candidate if candidate_count == 1 else -1)
        for k in members:
            mode = _MODE_ANY if liar < 0 else (_MODE_LIE if k == liar else _MODE_HONEST)
            if not apply_set(k, mode):
                return False
        return True

    def propagate() -> bool:
        while queue:
            k = queue.pop()
            in_queue[k] = False
            con = constraints[k]
            ok = process_row(con.row) if con.kind == _PARTY else apply_set(k, _MODE_EXACT)
            if not ok:
                while queue:
                    in_queue[queue.pop()] = False
                return False
        return True

    def record_solution() -> None:
        total = model.total_index
        needed = constraints[total].target - ones[total]
        free = unk[total]
        for x in range(n_vars):
            if val[x] == CAMERA:
                seen_camera[x] = True
            elif val[x] == SAFE:
                seen_safe[x] = True
            else:
                if needed > 0:
                    seen_camera[x] = True
                if needed < free:
                    seen_safe[x] = True

    def search() -> bool:
        nonlocal nodes, aborted
        nodes += 1
        if nodes > node_limit:
            aborted = True
            return False
        if not propagate():
            return False
        best, best_unknown = -1, inf
        for k in branch_cons:
            u = unk[k]
            if 0 < u < best_unknown:
                best, best_unknown = k, u
        if best < 0:
            record_solution()
            return True
        x = next(v for v in constraints[best].variables if val[v] == UNKNOWN)
        first = SAFE if seen_camera[x] else CAMERA
        for v in (first, 1 - first):
            mark = len(trail)
            assign(x, v)
            if search():
                return True
            undo(mark)
            if aborted:
                return False
        return False

    def try_with(x: int, v: int) -> tuple[bool, bool]:
        nonlocal nodes, aborted
        mark = len(trail)
        assign(x, v)
        nodes, aborted = 0, False
        ok = search()
        undo(mark)
        return ok, aborted

    for k in range(n_cons):
        enqueue(k)
    if not propagate():
        raise InconsistentBoardError("Known cells contradict the board's numbers.")

    easy = [Deduction(model.cells[x], val[x] == CAMERA) for x in range(n_vars) if val[x] != UNKNOWN]
    if easy and not full:
        return ForcedCells(tuple(easy), hard=False)

    forced = list(easy)
    for x in range(n_vars):
        if val[x] != UNKNOWN:
            continue
        while not (seen_safe[x] and seen_camera[x]):
            want = SAFE if seen_camera[x] else CAMERA
            ok, was_aborted = try_with(x, want)
            if was_aborted:
                break
            if not ok:
                forced.append(Deduction(model.cells[x], is_camera=want == SAFE))
                break
    return ForcedCells(tuple(forced), hard=True)
