import type { Game, Guide } from "../api/schemas.ts";
import type { CellAction } from "./board.ts";
import { MARK_GESTURE, type PointerText } from "./copy.ts";

/**
 * The words of the four training records, one per level of the day. The boards and their guided
 * moves live on the server (backend/app/services/training_records.py); these name its cells
 * ("the outlined 4"), so a change to a board there means a change to its words here.
 *
 * Each training opens with a card per guided move: the rule (or tip) and the move to try it on.
 * Then a free-play card: the player finishes the record alone. Wording: only cameras see. A cell
 * is "in line with" a number when it shares its row or column with no wall between them.
 */

/** A rule of the game, which the player must know, or a tip, which only makes solving easier. */
export type StepTag = "rule" | "tip" | "proTip";

export const STEP_TAGS: Record<StepTag, string> = {
  rule: "Rule",
  tip: "Tip",
  proTip: "Pro tip",
};

/** A card that teaches a gesture names the one for the player's pointer. */
export type TrainingCard = { tag: StepTag; title: string; text: PointerText };

export type TrainingCopy = {
  level: number;
  name: string;
  /** One card per guided move, in the server's order. */
  guides: TrainingCard[];
  /** Shown once the guided moves are done, while the player finishes the record alone. */
  free: TrainingCard;
  /** Shown under "Rectified" once the record is filed. */
  done: string;
  /** The rules this training teaches, one line each, for the rules card during a record. */
  rules: PointerText[];
};

export const TRAININGS: TrainingCopy[] = [
  {
    level: 1,
    name: "Basics",
    guides: [
      {
        tag: "rule",
        title: "Numbers count cameras",
        text: "A number counts the cameras in its row and column. Tap the outlined 0.",
      },
      {
        tag: "rule",
        title: "Clear the safe cells",
        text: "The 0 has no cameras in its row or column, so those cells are safe. Clear the outlined one.",
      },
      {
        tag: "tip",
        title: "Count the hidden cells",
        text: "Tap the outlined 4. It needs four cameras, and only four hidden cells are left in its row and column. So all four are cameras.",
      },
      {
        tag: "rule",
        title: "Never clear a camera",
        text: (pointer) =>
          `Clearing a camera is a strike. Three strikes end the record. Mark the outlined camera: ${MARK_GESTURE[pointer]}.`,
      },
    ],
    free: {
      tag: "tip",
      title: "Now finish the record",
      text: "Mark the 4's other cameras. Then clear every cell that isn't a camera.",
    },
    done: "You know the basics.",
    rules: [
      "Cameras see along their row and column, in every direction, until a wall or the edge.",
      "A number counts the cameras that can see its cell.",
      "Clear every cell that isn't a camera to file the record.",
      "Clearing a camera is a strike. The third strike in a record ends your day.",
      (pointer) => `To mark a camera, ${MARK_GESTURE[pointer]}. Marks are only notes.`,
      "Four records a day, in order. Three hints a day, one of each: Open (the magnifying glass) opens a cell you choose, Camera shows a camera, Safe (the camera struck through) shows a safe cell.",
    ],
  },
  {
    level: 2,
    name: "Walls",
    guides: [
      {
        tag: "rule",
        title: "Walls block the view",
        text: "A camera can't see through a wall: its line stops there. Tap the outlined 1. Its row stops at the wall, so the cells behind it don't count, and only one hidden cell is left in line with it.",
      },
    ],
    free: {
      tag: "proTip",
      title: "Now finish the record",
      text: "Watch Unmarked cameras. Once it reaches 0, every hidden cell left is safe, even where no number reaches.",
    },
    done: "Walls are covered.",
    rules: [
      "A camera can't see through a wall.",
      "Unmarked cameras counts down the record's cameras as you mark them.",
    ],
  },
  {
    level: 3,
    name: "Party records",
    guides: [
      {
        tag: "rule",
        title: "Red numbers can lie",
        text: (pointer) =>
          `Red numbers are Party records. In each row with red numbers, exactly one is false: one too high or one too low. The outlined red 1 is alone in its row, so it lies. Stamp it: ${MARK_GESTURE[pointer]}.`,
      },
      {
        tag: "tip",
        title: "A lie is one off",
        text: "So the red 1 really means 0 or 2. Only one hidden cell is in line with it, so it can't be 2: it means 0, and that cell is safe. Clear it.",
      },
      {
        tag: "proTip",
        title: "Compare with a true number",
        text: "Your own numbers are black and always true. Your 2 and the red 1 beside it have the same two hidden cells in line, so the red 1 should be 2. It is that row's lie: stamp it.",
      },
    ],
    free: {
      tag: "tip",
      title: "Now finish the record",
      text: "Once you know a row's lie, its other red numbers are true: use them like black numbers.",
    },
    done: "You can tell a Party record from the truth.",
    rules: [
      "Red numbers are Party records. In each row with red numbers, exactly one is false: one too high or one too low.",
      "Black numbers are always true. Once you know a row's lie, its other red numbers are true.",
      (pointer) => `To stamp a red number false, ${MARK_GESTURE[pointer]}. A stamp is only a note.`,
    ],
  },
  {
    level: 4,
    name: "Combining",
    guides: [
      {
        tag: "proTip",
        title: "One number is not enough",
        text: "Here no single number decides a cell. Compare two that share cells. Tap the outlined 1.",
      },
      {
        tag: "proTip",
        title: "Compare the two",
        text: "Now tap the other outlined 1. It counts the first 1's hidden cells too, and the first 1's camera is among them.",
      },
    ],
    free: {
      tag: "proTip",
      title: "Now finish the record",
      text: "So the right 1's one camera is the left 1's camera: every other hidden cell in line with the right 1 is safe.",
    },
    done: "You are ready for record IV.",
    rules: ["Record IV mixes walls, red numbers and numbers you must compare."],
  },
];

/** The words for a level's training. Throws for a level without one, so a new level can't ship untaught. */
export function trainingCopy(level: number): TrainingCopy {
  const copy = TRAININGS.find((candidate) => candidate.level === level);
  if (copy === undefined) throw new Error(`No training words for level ${level}.`);
  return copy;
}

/** How a move during a guided step is answered: let it through, or say why not. */
export type GuidedReply = "allow" | "wrongCell" | "wrongMove" | "ignore";

/**
 * Whether `action` on `cell` is the guided move. Until it is made, only that move goes through:
 * the player tries the new rule before playing freely. This is teaching, not a rule of the game.
 */
export function guidedMove(guide: Guide, cell: number, action: CellAction): GuidedReply {
  if (action === "none") return "ignore";
  if (cell !== guide.cell) return "wrongCell";
  return action === guide.action ? "allow" : "wrongMove";
}

/**
 * How many guided moves, from the first, are done. A clear, mark or stamp shows on the board;
 * a select leaves no trace there, so the guides the player selected are passed in.
 */
export function guidesDone(guides: Guide[], game: Game, selected: ReadonlySet<number>): number {
  const done = (guide: Guide, index: number): boolean => {
    const cell = game.cells[guide.cell];
    switch (guide.action) {
      case "select":
        return selected.has(index);
      case "clear":
        return cell.kind === "observation";
      case "mark":
        return cell.kind === "marked";
      case "stamp":
        return cell.kind === "given" && cell.stamped;
    }
  };
  const pending = guides.findIndex((guide, index) => !done(guide, index));
  return pending === -1 ? guides.length : pending;
}
