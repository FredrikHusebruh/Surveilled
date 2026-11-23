import type { Cell, Game } from "../api/schemas.ts";

/** Pure board geometry and counting helpers shared by the controller hooks and views. */

/** Whether a cell shows a number the player can select to see its sight lines. */
export function isNumbered(cell: Cell): cell is Extract<Cell, { kind: "given" | "observation" }> {
  return cell.kind === "given" || cell.kind === "observation";
}

/** Whether the player can still clear or mark the cell. */
export function isUnrevealed(cell: Cell): boolean {
  return cell.kind === "hidden" || cell.kind === "marked";
}

/** A plain tap, or a mark gesture: long-press, right-click or `m`/`f`. */
export type Gesture = "tap" | "mark";

/**
 * What a gesture on a cell asks for. "tapMarked" is a plain tap on a marked cell, which does
 * nothing but deserves a word. A tap clears or selects; the mark gesture marks or stamps. Shared
 * by the daily and training boards, so both read input the same way. The server still decides
 * what any move means.
 */
export type CellAction = "select" | "clear" | "mark" | "stamp" | "tapMarked" | "none";

export function cellAction(cell: Cell, gesture: Gesture, lies: boolean): CellAction {
  if (gesture === "tap") {
    if (isNumbered(cell)) return "select";
    if (cell.kind === "marked") return "tapMarked";
    return cell.kind === "hidden" ? "clear" : "none";
  }
  if (cell.kind === "given" && lies) return "stamp";
  if (isNumbered(cell)) return "select";
  return isUnrevealed(cell) ? "mark" : "none";
}

/** Cameras the player has not yet marked or been seen by. Never negative, even with extra marks. */
export function unmarkedCameraCount(game: Game): number {
  const accounted = game.cells.filter((c) => c.kind === "marked" || c.kind === "exposed").length;
  return Math.max(0, game.cameraCount - accounted);
}

/** Taxicab distance between two cells, in cell steps. */
function steps(cols: number, from: number, to: number): number {
  return (
    Math.abs(Math.floor(to / cols) - Math.floor(from / cols)) + Math.abs((to % cols) - (from % cols))
  );
}

/** Taxicab distance from `from` to every cell in line with it, which staggers the sight-line sweep. */
export function sightDistances(game: Game, from: number): Map<number, number> {
  return new Map(game.sightLines[from].map((cell) => [cell, steps(game.cols, from, cell)]));
}

/** The pace of the sight-line sweep and of a cascade being typed in: ms per cell of distance. */
export const SWEEP_MS_PER_STEP = 45;
/** The largest a typist's unevenness pushes a keystroke early or late, in ms. */
const RHYTHM_MS = 12;

/**
 * The cells a move opened, each with the delay in ms before it is typed in. Read off the two views
 * the server sent, before and after the move: a cell opened if it was hidden or marked and now
 * shows a number. `from`, the cell the player opened, is typed at once. The others follow the
 * flood outward from `from` through the open cells (around walls and
 * hidden cells, as the cascade spread), each step a little early or late like a typist's rhythm,
 * fixed per cell.
 */
export function revealDelays(before: Game, after: Game, from: number): Map<number, number> {
  const depth = floodDepths(after, from);
  const opened = after.cells.flatMap((cell, index) =>
    index !== from && cell.kind === "observation" && isUnrevealed(before.cells[index]) ? [index] : [],
  );
  return new Map([
    [from, 0],
    ...opened.map((cell): [number, number] => {
      const reach = depth.get(cell) ?? steps(after.cols, from, cell);
      return [cell, reach * SWEEP_MS_PER_STEP + rhythm(cell)];
    }),
  ]);
}

/** A cell's fixed rhythm offset, from -RHYTHM_MS to +RHYTHM_MS. */
function rhythm(cell: number): number {
  return ((cell * 37 + 11) % (2 * RHYTHM_MS + 1)) - RHYTHM_MS;
}

/** Steps from `from` to every numbered cell, moving up, down, left or right through numbered cells. */
function floodDepths(game: Game, from: number): Map<number, number> {
  const depth = new Map([[from, 0]]);
  const queue = [from];
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    const row = Math.floor(cell / game.cols);
    const col = cell % game.cols;
    const neighbours = [
      row > 0 ? cell - game.cols : -1,
      row < game.rows - 1 ? cell + game.cols : -1,
      col > 0 ? cell - 1 : -1,
      col < game.cols - 1 ? cell + 1 : -1,
    ];
    for (const next of neighbours) {
      if (next < 0 || depth.has(next) || !isNumbered(game.cells[next])) continue;
      depth.set(next, (depth.get(cell) ?? 0) + 1);
      queue.push(next);
    }
  }
  return depth;
}

/** "row N, column M", 1-based, for cell labels. */
export function cellPosition(cols: number, cell: number): string {
  return `row ${Math.floor(cell / cols) + 1}, column ${(cell % cols) + 1}`;
}
