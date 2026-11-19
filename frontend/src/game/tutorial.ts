import type { Cell, LevelState } from "../api/schemas.ts";

/**
 * How to play: seven pages, each a rule in words plus an animated demo. Demo boards are written in
 * a small notation, one string per row with space-separated tokens:
 *
 *   .  hidden cell        #  wall               M  marked camera
 *   X  exposed camera     R  revealed camera    W  wrong mark
 *   3  your observation   3p Party record       3ps Party record stamped false
 *
 * The demos are illustrations, hand-drawn to be consistent: every number matches the cameras that
 * can really see it. They are not generated, and no rule logic runs here.
 */

export type Verdict = "Rectified" | "Seen" | "Toppled";

export type BoardFrame = {
  rows: string[];
  /** The number (or camera) whose sight lines are shown. */
  selected?: number;
  /** Cells lit by the selected cell's sight lines. */
  gaze?: number[];
  hinted?: number;
  /** Shows the strike row when set. */
  strikes?: number;
  verdict?: Verdict;
  caption: string;
};

export type LevelsFrame = { states: LevelState[]; verdict?: Verdict; caption: string };

export type TutorialPage = {
  title: string;
  text: string[];
  demo: { kind: "board"; lies: boolean; frames: BoardFrame[] } | { kind: "levels"; frames: LevelsFrame[] };
};

const TOKENS: Record<string, Cell> = {
  ".": { kind: "hidden" },
  "#": { kind: "wall" },
  M: { kind: "marked", wrong: false },
  W: { kind: "marked", wrong: true },
  X: { kind: "exposed" },
  R: { kind: "revealed" },
};

/** Parses demo rows into cells. Throws on a ragged board or an unknown token: content bugs fail loudly. */
export function parseDemoRows(rows: string[]): { cols: number; cells: Cell[] } {
  const grid = rows.map((row) => row.trim().split(/\s+/));
  const cols = grid[0]?.length ?? 0;
  if (cols === 0 || grid.some((row) => row.length !== cols)) {
    throw new Error(`Demo board rows must all have the same length: ${JSON.stringify(rows)}`);
  }
  return { cols, cells: grid.flat().map(parseToken) };
}

function parseToken(token: string): Cell {
  const fixed = TOKENS[token];
  if (fixed !== undefined) return fixed;
  const match = /^(\d)(p?)(s?)$/.exec(token);
  if (match === null) throw new Error(`Unknown demo token "${token}".`);
  const value = Number(match[1]);
  if (match[2] === "p") return { kind: "given", value, stamped: match[3] === "s" };
  return { kind: "observation", value };
}

// A 4x4 record used on several pages: cameras at cells 1, 6 and 13, a wall at cell 10.
// True counts: 0:1  2:2  3:1  4:1  5:3  7:1  8:0  9:2  11:0  12:1  14:1  15:1.
const OPENING = ["1 . . 1", ". . . .", "0 . # 0", ". . . 1"];

export const TUTORIAL: TutorialPage[] = [
  {
    title: "Cameras watch in straight lines",
    text: [
      "Hidden cameras watch up, down, left and right until a wall or the edge of the record stops them.",
      "They never see diagonally, and a camera does not block another camera's view.",
    ],
    demo: {
      kind: "board",
      lies: false,
      frames: [
        { rows: [". . . .", ". M . #", ". . . .", ". # . ."], caption: "A camera." },
        {
          rows: [". . . .", ". M . #", ". . . .", ". # . ."],
          selected: 5,
          gaze: [1, 9, 4, 6],
          caption: "It watches up, down, left and right.",
        },
        {
          rows: [". . . .", ". M . #", ". . . .", ". # . ."],
          selected: 5,
          gaze: [1, 9, 4, 6],
          caption: "Walls stop it. It never sees diagonally.",
        },
      ],
    },
  },
  {
    title: "Numbers count cameras",
    text: [
      "A number shows how many cameras can see that cell.",
      "Tap a number to light up its sight lines. The cameras it counts are somewhere in the lit cells.",
    ],
    demo: {
      kind: "board",
      lies: false,
      frames: [
        { rows: [". . . .", ". # . .", ". . 2 .", ". . . ."], caption: "A number." },
        {
          rows: [". . . .", ". # . .", ". . 2 .", ". . . ."],
          selected: 10,
          gaze: [6, 2, 14, 9, 8, 11],
          caption: "Tap it to light up what it sees.",
        },
        {
          rows: [". . M .", ". # . .", "M . 2 .", ". . . ."],
          selected: 10,
          gaze: [6, 2, 14, 9, 8, 11],
          caption: "Two cameras can see it, so it shows 2.",
        },
      ],
    },
  },
  {
    title: "Clear safe cells, mark cameras",
    text: [
      "Tap a hidden cell to clear it. A safe cell shows its own number.",
      "A 0 means no camera can see it, so everything it sees is cleared for you.",
      "Mark a camera with a long-press, a right-click, or Mark camera mode. Clear every safe cell to file the record.",
    ],
    demo: {
      kind: "board",
      lies: false,
      frames: [
        { rows: [". . . .", ". . . .", ". . . .", ". . . ."], hinted: 12, caption: "Tap a hidden cell." },
        { rows: [". . . .", ". . . .", ". . . .", "0 . . ."], caption: "A 0: no camera can see it." },
        { rows: ["1 1 1 .", "0 0 0 1", "0 0 0 1", "0 0 0 1"], caption: "So everything it sees is cleared too." },
        { rows: ["1 1 1 M", "0 0 0 1", "0 0 0 1", "0 0 0 1"], caption: "Mark the camera." },
        {
          rows: ["1 1 1 M", "0 0 0 1", "0 0 0 1", "0 0 0 1"],
          verdict: "Rectified",
          caption: "Every safe cell cleared. The record is filed.",
        },
      ],
    },
  },
  {
    title: "Three strikes",
    text: [
      "Clear a camera and you have been seen. That is a strike.",
      "Each record allows three strikes. The third ends your day, and the records reopen at midnight.",
      "Strikes do not carry over: every record starts with three fresh ones.",
    ],
    demo: {
      kind: "board",
      lies: false,
      frames: [
        { rows: OPENING, strikes: 0, caption: "Three strikes allowed." },
        { rows: ["1 X . 1", ". . . .", "0 . # 0", ". . . 1"], strikes: 1, caption: "A camera. You were seen." },
        { rows: ["1 X . 1", ". . X .", "0 . # 0", ". . . 1"], strikes: 2, caption: "Strike two." },
        {
          rows: ["1 X . 1", ". . X .", "0 . # 0", ". X . 1"],
          strikes: 3,
          verdict: "Seen",
          caption: "Strike three. Your day is over.",
        },
      ],
    },
  },
  {
    title: "Party records lie",
    text: [
      "Red numbers are Party records. In every row that has red numbers, exactly one of them is false, off by exactly one. If a row has only one red number, that one is false.",
      "Black numbers are your own observations. They are always true.",
      "In Mark camera mode, tap a red number to stamp it false. The stamp is a note for you; it changes nothing.",
    ],
    demo: {
      kind: "board",
      lies: true,
      frames: [
        { rows: ["1p . . 2p", ". . . .", "0p 1p # .", "1p . . 0p"], caption: "Red numbers come from the Party." },
        {
          rows: ["1p . . 2p", ". . . .", "0p 1p # .", "1p . . 0p"],
          selected: 3,
          caption: "One in each row is false, off by one.",
        },
        {
          rows: ["1p . . 2ps", ". . . .", "0p 1p # .", "1p . . 0p"],
          caption: "Stamp the false one in Mark camera mode.",
        },
        {
          rows: ["1p . . 2ps", "1 . . .", "0p 1p # .", "1p . . 0p"],
          selected: 4,
          gaze: [0, 8, 12, 5, 6, 7],
          caption: "Black numbers are yours. Always true.",
        },
      ],
    },
  },
  {
    title: "Stuck? Take a hint",
    text: [
      "Every record can be solved without guessing. If you are stuck, a deduction is waiting.",
      "Walls cut every row and column into stretches. Cells in the same stretch share that part of their count, so the difference between two of their numbers comes from the other direction.",
      "When no number helps, count the cameras still unmarked.",
      "Hint outlines a number and a cell it proves. You get three hints a day, shared by all four records. Each one is counted on your result card.",
    ],
    demo: {
      kind: "board",
      lies: false,
      frames: [
        { rows: OPENING, caption: "No move in sight." },
        {
          rows: OPENING,
          selected: 8,
          gaze: [4, 0, 12, 9],
          hinted: 4,
          caption: "Hint: this 0 proves the dashed cell is safe.",
        },
        { rows: ["1 . . 1", "1 . . .", "0 . # 0", ". . . 1"], caption: "Cleared. The hint goes on your card." },
      ],
    },
  },
  {
    title: "Four records a day",
    text: [
      "Four sealed records open every day at your midnight, the same for everyone. Each is harder than the last.",
      "Open them in order. A record's clock starts when you open it.",
      "File all four and the Ministry falls. Then share your result.",
    ],
    demo: {
      kind: "levels",
      frames: [
        { states: ["open", "locked", "locked", "locked"], caption: "Record I is open." },
        { states: ["filed", "open", "locked", "locked"], caption: "File it to open the next." },
        { states: ["filed", "filed", "open", "locked"], caption: "Each is harder than the last." },
        { states: ["filed", "filed", "filed", "open"], caption: "The last: the Ministry of Truth." },
        { states: ["filed", "filed", "filed", "filed"], verdict: "Toppled", caption: "All four filed. The Ministry falls." },
      ],
    },
  },
];
