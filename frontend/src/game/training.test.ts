import { describe, expect, test } from "vitest";
import type { Cell, Game, Guide } from "../api/schemas.ts";
import { guidedMove, guidesDone, trainingCopy } from "./training.ts";

function game(cells: Cell[]): Game {
  return {
    recordNo: 1,
    rows: 1,
    cols: cells.length,
    lies: true,
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

describe("guidedMove", () => {
  const guide: Guide = { cell: 2, action: "mark" };

  test("lets the guided move through", () => {
    expect(guidedMove(guide, 2, "mark")).toBe("allow");
  });

  test("turns away any other cell", () => {
    expect(guidedMove(guide, 1, "mark")).toBe("wrongCell");
    expect(guidedMove(guide, 1, "select")).toBe("wrongCell");
  });

  test("names a wrong move on the right cell", () => {
    expect(guidedMove(guide, 2, "clear")).toBe("wrongMove");
  });

  test("ignores gestures that do nothing", () => {
    expect(guidedMove(guide, 1, "none")).toBe("ignore");
  });
});

describe("guidesDone", () => {
  const guides: Guide[] = [
    { cell: 0, action: "select" },
    { cell: 1, action: "clear" },
    { cell: 2, action: "mark" },
    { cell: 3, action: "stamp" },
  ];
  const fresh: Cell[] = [
    { kind: "given", value: 1, stamped: false },
    { kind: "hidden" },
    { kind: "hidden" },
    { kind: "given", value: 0, stamped: false },
  ];

  test("counts nothing on a fresh board", () => {
    expect(guidesDone(guides, game(fresh), new Set())).toBe(0);
  });

  test("a select is done once the player selected it", () => {
    expect(guidesDone(guides, game(fresh), new Set([0]))).toBe(1);
  });

  test("clears, marks and stamps are read off the board, in order", () => {
    const played: Cell[] = [
      fresh[0],
      { kind: "observation", value: 0 },
      { kind: "marked", wrong: false },
      { kind: "given", value: 0, stamped: true },
    ];
    expect(guidesDone(guides, game(played), new Set([0]))).toBe(4);
    expect(guidesDone(guides, game(played), new Set())).toBe(0);
  });
});

test("every level has training words", () => {
  for (const level of [1, 2, 3, 4]) expect(trainingCopy(level).level).toBe(level);
});
