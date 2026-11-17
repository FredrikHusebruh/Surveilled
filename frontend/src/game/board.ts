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

/** Cameras the player has not yet marked or been seen by. Never negative, even with extra marks. */
export function unmarkedCameraCount(game: Game): number {
  const accounted = game.cells.filter((c) => c.kind === "marked" || c.kind === "exposed").length;
  return Math.max(0, game.cameraCount - accounted);
}

/** Taxicab distance from `from` to every cell it sees, which staggers the sight-line sweep. */
export function sightDistances(game: Game, from: number): Map<number, number> {
  const row = Math.floor(from / game.cols);
  const col = from % game.cols;
  return new Map(
    game.sightLines[from].map((cell) => [
      cell,
      Math.abs(Math.floor(cell / game.cols) - row) + Math.abs((cell % game.cols) - col),
    ]),
  );
}

/** "row N, column M", 1-based, for cell labels. */
export function cellPosition(game: Game, cell: number): string {
  return `row ${Math.floor(cell / game.cols) + 1}, column ${(cell % game.cols) + 1}`;
}
