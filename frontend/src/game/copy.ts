import type { Cell, Game, GuideAction, Hint, HintKind, LevelState, OpenOutcome, Standing } from "../api/schemas.ts";
import { ApiError } from "../api/client.ts";
import { isNumbered } from "./board.ts";

/**
 * Every sentence the game says to the player. Copy rules (design.md rule 10): short, flat,
 * second person, no exclamation marks, no praise. Vocabulary: record, filing, Rectified, Seen,
 * Toppled, Party records, observations, strikes, cameras.
 */

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

export function romanNumeral(index: number): string {
  const numeral = ROMAN_NUMERALS[index];
  if (numeral === undefined) throw new RangeError(`No numeral for level index ${index}.`);
  return numeral;
}

export function formatRecordNo(recordNo: number): string {
  return String(recordNo).padStart(5, "0");
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * A record date ("2026-11-21") as the form writes it: "21 November 2026". Read straight from the
 * ISO string, never through Date, so no time zone can shift it to the day before.
 */
export function formatRecordDate(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  const month = match === null ? undefined : MONTHS[Number(match[2]) - 1];
  if (match === null || month === undefined) throw new Error(`Not a record date: "${day}".`);
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Hours, minutes and seconds, for the countdown to the next day's records. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  return `${String(hours).padStart(2, "0")}:${formatClock(total % 3600)}`;
}

export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

const COUNT = new Intl.NumberFormat("en-GB");
/** Everyone else playing the same day: fellow insiders. */
const insiders = (n: number): string => `${COUNT.format(n)} ${n === 1 ? "insider" : "insiders"}`;

export const STANDING_LOADING = "Comparing your file with the others.";

/** "Top 8%", "Further than 40%" (seen), "Better than 30%", or null when you beat nobody yet. */
function rankingPhrase(standing: Standing): string | null {
  if (standing.topPercent <= 50) return `Top ${standing.topPercent}%`;
  const toppled = standing.levelsFiled === standing.reached.length - 1;
  if (!toppled && standing.furtherPercent > 0) return `Further than ${standing.furtherPercent}%`;
  if (standing.beatPercent > 0) return `Better than ${standing.beatPercent}%`;
  return null;
}

/** The standing's headline on the day's last report. */
export function standingHeadline(standing: Standing): string {
  const phrase = rankingPhrase(standing);
  return phrase === null ? `Last of ${insiders(standing.players)} so far.` : `${phrase} of insiders today.`;
}

export function standingTooFew(standing: Standing): string {
  return `Too few insiders have finished Day ${standing.dayNumber} to compare yet. Check the report again later.`;
}

export type ScoreLine = { label: string; value: string };

/**
 * How the score was made, as receipt lines: the time, then a line per kind of penalty the player
 * took. The total is `formatClock(standing.totalSeconds)`.
 */
export function scoreLines(standing: Standing): ScoreLine[] {
  const sum = (pick: (level: Standing["levels"][number]) => number) =>
    standing.levels.reduce((total, level) => total + pick(level), 0);
  const hints = sum((level) => level.hints);
  const strikes = sum((level) => level.strikes);
  const lines = [{ label: "Time", value: formatClock(sum((level) => level.seconds)) }];
  if (hints > 0) lines.push({ label: plural(hints, "hint"), value: `+${formatClock(sum((level) => level.hintPenaltySeconds))}` });
  if (strikes > 0) lines.push({ label: plural(strikes, "strike"), value: `+${formatClock(sum((level) => level.strikePenaltySeconds))}` });
  return lines;
}

/** The standing on the share card: "Score 22:45 · top 8% of 1,204 insiders". */
export function standingShareLine(standing: Standing): string {
  const score = `Score ${formatClock(standing.totalSeconds)}`;
  const phrase = standing.comparable ? rankingPhrase(standing) : null;
  return phrase === null ? score : `${score} · ${phrase.toLowerCase()} of ${insiders(standing.players)}`;
}

/** Words around the training records. Each training's own words live in training.ts. */
export const TRAINING = {
  record: "Training record",
  start: "Start training",
  skip: "Skip training",
  open: "How to play",
  leave: "Leave training",
  backToOrders: "Back to orders",
  next: "Next training",
  done: "Done",
  tryAgain: "Try again",
  recordNo: "Training",
  wrongCell: "Try it on the outlined cell first.",
  lost: "Seen three times. Try the record again: nothing is recorded in training.",
  rulesTitle: "Rules",
  rulesNote: "Practise any time: open How to play from a record's orders.",
} as const;

/** The typewriter sound switch: it reads as its state, so it needs no other label. */
export const SOUND = { on: "Sound on", off: "Sound off" } as const;

/** The player's main pointer: a finger (a coarse pointer) or a mouse. Help names only its gesture. */
export type Pointer = "touch" | "mouse";

/** How to mark a camera or stamp a Party record with the pointer in use. A tap clears or selects. */
export const MARK_GESTURE: Record<Pointer, string> = {
  touch: "press and hold it",
  mouse: "right-click it",
};

/** Player-facing words that name a gesture, so they depend on the player's pointer. */
export type PointerText = string | ((pointer: Pointer) => string);

/** The words for the player's pointer. */
export function forPointer(text: PointerText, pointer: Pointer): string {
  return typeof text === "string" ? text : text(pointer);
}

/** A guided training move's reply when the player picked the right cell but the wrong move for it. */
export function wrongMove(action: GuideAction, pointer: Pointer): string {
  switch (action) {
    case "select":
      return "Tap it to light up the cells in line with it.";
    case "clear":
      return "That cell is safe. Tap it to clear it.";
    case "mark":
      return `Mark it: ${MARK_GESTURE[pointer]}.`;
    case "stamp":
      return `Stamp it: ${MARK_GESTURE[pointer]}.`;
  }
}

export const PREPARING_MESSAGE = "Preparing the records.";
export const START_PAGE_NOTE = "Read your orders first. The clock starts when you start the operation.";

/** Words on the sealed folder each record arrives in. */
export const FOLDER = {
  stamp: "Top secret",
  sender: "Ministry of Truth",
  eyesOnly: "Eyes only",
  sealed: "Sealed",
  heading: "Sealed record",
  instruction: "Open on receipt.",
  tab: "Blind Spot",
} as const;
export const OUT_MESSAGE =
  "You were seen. The red cameras show where the others were. The records reopen at midnight.";
export const TOPPLED_MESSAGE = "The government is toppled for today. New records open at midnight.";
export const SHARE_COPIED = "Result copied. Paste it anywhere.";
export const SHARE_FAILED = "The result could not be copied. Try Share result again.";

export const LEVEL_STATE_LABELS: Record<LevelState, string> = {
  locked: "Locked",
  open: "Open",
  playing: "In progress",
  filed: "Filed",
  seen: "Seen",
};
export const CASCADE_MESSAGE = "A zero: no camera can see it, so every cell in line with it is safe. Those were cleared too.";
/** The answer to a plain tap on a marked cell, which does nothing. */
export function markedCellMessage(pointer: Pointer): string {
  return `That cell is marked as a camera. To remove the mark, ${MARK_GESTURE[pointer]} again.`;
}

export function defaultMessage(lies: boolean): string {
  return lies
    ? "Tap a number to light up the cells in line with it. Trust the black numbers; doubt the red ones."
    : "Tap a number to light up the cells in line with it.";
}

export function seenMessage(strikes: number, maxStrikes: number): string {
  return `You were seen. Strike ${strikes} of ${maxStrikes}. That cell held a camera.`;
}

/**
 * What is in line with a selected number and what that implies, counting only what the player
 * knows. Only cameras see: a number never "sees" anything.
 */
export function sightMessage(game: Game, cell: number): string {
  const target = game.cells[cell];
  if (!isNumbered(target)) throw new Error(`Cell ${cell} has no number to describe.`);
  const seen: Cell[] = game.sightLines[cell].map((j) => game.cells[j]);
  const marked = seen.filter((c) => c.kind === "marked" || c.kind === "exposed").length;
  const hidden = seen.filter((c) => c.kind === "hidden").length;
  const need = target.value - marked;

  let text = `In line with this ${target.value}: ${plural(marked, "marked camera")} and ${plural(hidden, "hidden cell")}.`;
  if (target.kind === "given" && game.lies) text += " It is a Party record, so it may be one too high or one too low.";
  else if (hidden > 0 && need === 0)
    text += ` It already counts all its cameras, so ${hidden === 1 ? "that hidden cell is safe" : "those hidden cells are safe"}.`;
  else if (hidden > 0 && need === hidden)
    text += ` It needs ${need} more, so ${hidden === 1 ? "that hidden cell is a camera" : "those hidden cells are cameras"}.`;
  else if (need > 0) text += ` It needs ${need} more among them.`;
  return text;
}

/** The three hints, in the order the controls show them. */
export const HINT_KINDS: readonly HintKind[] = ["open", "camera", "safe"];

/**
 * Each hint key's small word under its symbol (`HintIcon`), and what the hint does (for screen
 * readers). Never "blind spot" for a safe cell: cameras can still see it.
 */
export const HINTS: Record<HintKind, { label: string; does: string }> = {
  open: { label: "Open", does: "open a cell you choose" },
  camera: { label: "Camera", does: "show a camera" },
  safe: { label: "Safe", does: "show a safe cell" },
};

/** Whether a hint can still be taken: left today, used today, or free (training). */
export type HintState = "left" | "used" | "free";

/** The word a hint key shows in place of its own once it is used for the day. */
export const HINT_USED = "Used";

/** What a hint button says to screen readers. */
export function hintButtonLabel(kind: HintKind, state: HintState): string {
  const status = { left: "1 left today", used: "used today", free: "free in training" }[state];
  return `Hint: ${HINTS[kind].does}, ${status}`;
}

export const OPEN_CHOOSE_MESSAGE = "Tap a hidden cell to open it. Tap Open again to cancel.";

/** The message once the Open hint has opened the chosen cell. */
export function openMessage(outcome: OpenOutcome, lies: boolean): string {
  switch (outcome) {
    case "marked":
      return "That cell is a camera. It is marked for you, with no strike.";
    case "cascade":
      return CASCADE_MESSAGE;
    case "cleared":
      return `That cell is safe. ${defaultMessage(lies)}`;
  }
}

export function hintMessage(hint: Hint, lies: boolean): string {
  switch (hint.kind) {
    case "wrong_mark":
      return "One of your marks is on a safe cell. The dashed outline shows it.";
    case "none":
      return "Every camera is already marked.";
    case "located":
      return hint.verdict === "camera"
        ? "The dashed cell is a camera. Nothing on the board proves it yet."
        : "The dashed cell is safe. Nothing on the board proves it yet.";
    case "clue": {
      if (hint.verdict === "camera") {
        return `Look at the outlined ${hint.clueValue}. It needs ${plural(hint.clueValue - hint.camerasSeen, "camera")} more and has exactly ${plural(hint.hiddenSeen, "hidden cell")} in line with it, so they are all cameras, including the dashed one.`;
      }
      if (hint.clueValue === 0) {
        return "Look at the outlined 0. No camera can see it, so every hidden cell in line with it is safe, including the dashed one.";
      }
      return `Look at the outlined ${hint.clueValue}. It already counts all ${plural(hint.camerasSeen, "camera")} it needs, so every other hidden cell in line with it is safe, including the dashed one.`;
    }
    case "deduction": {
      const safe = hint.verdict === "safe";
      if (lies) {
        return `The dashed cell ${safe ? "can be proven safe" : "must be a camera"}. Work out which red number in its rows is the false one.`;
      }
      return safe
        ? "The dashed cell can be proven safe, but it takes two or more numbers together, or the total camera count. Compare numbers that share a stretch."
        : "The dashed cell must be a camera, but it takes two or more numbers together, or the total camera count.";
    }
  }
}

/** The result line in the Archivist's report: the facts of a closed record. */
export function verdictMessage(game: Game, isFinal: boolean, totalSeconds: number): string {
  const record = `Record ${formatRecordNo(game.recordNo)}`;
  const tally = `${plural(game.hints, "hint")} and ${plural(game.strikes, "strike")}`;
  if (game.status === "lost") return `${record} closed after ${formatClock(game.elapsedSeconds)} with ${tally}.`;
  if (isFinal) return `${record} filed with ${tally}. Four records filed in ${formatClock(totalSeconds)}.`;
  return `${record} filed in ${formatClock(game.elapsedSeconds)} with ${tally}.`;
}

/**
 * A failed request, stated plainly. A 4xx is the server refusing the move, with a player-safe
 * reason. A 5xx (including the dev proxy's 502 when the backend is down) or a network error means
 * nobody answered, so it gets a generic line; the details are in the console.
 */
export function failureMessage(error: unknown): string {
  if (error instanceof ApiError && error.status < 500) return `Request refused. ${error.message}`;
  return "Request failed. The records office did not answer.";
}

/** The cell's state and position, for its aria-label (design.md accessibility rules). */
export function cellLabel(cell: Cell, lies: boolean, position: string): string {
  return `${cellStateLabel(cell, lies)}, ${position}`;
}

function cellStateLabel(cell: Cell, lies: boolean): string {
  switch (cell.kind) {
    case "wall":
      return "Wall";
    case "hidden":
      return "Hidden cell";
    case "marked":
      return cell.wrong ? "Wrong mark, safe cell" : "Marked camera";
    case "exposed":
      return "Camera, you were seen";
    case "revealed":
      return "Camera";
    case "given":
      return `${lies ? "Party record" : "Observation"} ${cell.value}${cell.stamped ? ", stamped false" : ""}`;
    case "observation":
      return `Your observation ${cell.value}`;
  }
}
