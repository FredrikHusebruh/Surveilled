import { describe, expect, test } from "vitest";
import type { Cell, Game } from "../api/schemas.ts";
import { SWEEP_MS_PER_STEP, revealDelays } from "./board.ts";

/** A 3×3 board from its nine cells, row by row. */
function game(cells: Cell[]): Game {
  return {
    recordNo: 1,
    rows: 3,
    cols: 3,
    lies: false,
    cameraCount: 1,
    rating: 1,
    status: "play",
    strikes: 0,
    maxStrikes: 3,
    hints: 0,
    elapsedSeconds: 0,
    cells,
    sightLines: cells.map(() => []),
  };
}

const H: Cell = { kind: "hidden" };
const W: Cell = { kind: "wall" };
const n = (value: number): Cell => ({ kind: "observation", value });

/** Each delay as the flood step it falls in, which the typist's rhythm never pushes out of. */
function stepsOf(delays: Map<number, number>): Map<number, number> {
  return new Map([...delays].map(([cell, ms]) => [cell, Math.round(ms / SWEEP_MS_PER_STEP)]));
}

describe("revealDelays", () => {
  test("a single clear types just that cell, at once", () => {
    const before = game([H, H, H, H, H, H, H, H, H]);
    const after = game([H, H, H, H, n(2), H, H, H, H]);
    expect(revealDelays(before, after, 4)).toEqual(new Map([[4, 0]]));
  });

  test("a cascade types outward, one flood step at a time", () => {
    const before = game([H, H, H, H, H, H, H, H, H]);
    const after = game([n(0), n(0), n(1), n(0), n(1), H, n(1), H, H]);
    expect(stepsOf(revealDelays(before, after, 0))).toEqual(
      new Map([
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 1],
        [4, 2],
        [6, 2],
      ]),
    );
  });

  test("the flood goes around a wall, not through it", () => {
    const before = game([H, W, H, H, H, H, H, H, H]);
    const after = game([n(0), W, n(1), n(0), n(0), n(0), H, H, H]);
    // Cell 2 is two cells from 0 in a straight line, but the cascade reached it by 3, 4 and 5.
    expect(stepsOf(revealDelays(before, after, 0)).get(2)).toBe(4);
  });

  test("cells in the same step are not typed in lockstep", () => {
    const before = game([H, H, H, H, H, H, H, H, H]);
    const after = game([n(0), n(0), n(1), n(0), n(1), H, n(1), H, H]);
    const delays = revealDelays(before, after, 0);
    expect(delays.get(1)).not.toBe(delays.get(3));
  });

  test("leaves out cells that were already open", () => {
    const before = game([n(0), H, H, H, H, H, H, H, H]);
    const after = game([n(0), n(1), H, H, H, H, H, H, H]);
    expect(revealDelays(before, after, 1)).toEqual(new Map([[1, 0]]));
  });
});
