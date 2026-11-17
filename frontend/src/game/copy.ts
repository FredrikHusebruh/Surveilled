import type { Cell, Game, Hint, LevelState, Standing } from "../api/schemas.ts";
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
const clerks = (n: number): string => `${COUNT.format(n)} ${n === 1 ? "clerk" : "clerks"}`;

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
  return phrase === null ? `Last of ${clerks(standing.players)} so far.` : `${phrase} of clerks today.`;
}

export function standingTooFew(standing: Standing): string {
  return `Too few clerks have finished Day ${standing.dayNumber} to compare yet. Check the report again later.`;
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

/** The standing on the share card: "Score 22:45 · top 8% of 1,204 clerks". */
export function standingShareLine(standing: Standing): string {
  const score = `Score ${formatClock(standing.totalSeconds)}`;
  const phrase = standing.comparable ? rankingPhrase(standing) : null;
  return phrase === null ? score : `${score} · ${phrase.toLowerCase()} of ${clerks(standing.players)}`;
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
export const CASCADE_MESSAGE = "A zero. Everything it sees is safe, so those cells were cleared too.";
export const MARKED_CELL_MESSAGE =
  "That cell is marked as a camera. Switch to Mark camera and tap it to remove the mark.";

export function defaultMessage(lies: boolean): string {
  return lies
    ? "Tap a number to see its sight lines. Trust the black numbers; doubt the red ones."
    : "Tap a number to see its sight lines.";
}

export function seenMessage(strikes: number, maxStrikes: number): string {
  return `You were seen. Strike ${strikes} of ${maxStrikes}. That cell held a camera.`;
}

/** What a selected number sees and what that implies, counting only what the player knows. */
export function sightMessage(game: Game, cell: number): string {
  const target = game.cells[cell];
  if (!isNumbered(target)) throw new Error(`Cell ${cell} has no number to describe.`);
  const seen: Cell[] = game.sightLines[cell].map((j) => game.cells[j]);
  const marked = seen.filter((c) => c.kind === "marked" || c.kind === "exposed").length;
  const hidden = seen.filter((c) => c.kind === "hidden").length;
  const need = target.value - marked;

  let text = `This ${target.value} sees ${plural(marked, "marked camera")} and ${plural(hidden, "hidden cell")}.`;
  if (target.kind === "given" && game.lies) text += " It is a Party record, so it may be off by one.";
  else if (hidden > 0 && need === 0) text += " It is satisfied: every hidden cell it sees is safe.";
  else if (hidden > 0 && need === hidden)
    text += ` It needs ${need} more, so every hidden cell it sees is a camera.`;
  else if (need > 0) text += ` It needs ${need} more among them.`;
  return text;
}

export function hintMessage(hint: Hint, lies: boolean): string {
  switch (hint.kind) {
    case "wrong_mark":
      return "One of your marks is on a safe cell. The dashed outline shows it.";
    case "none":
      return "No new deduction found. Check your marks.";
    case "clue": {
      if (hint.verdict === "camera") {
        return `Look at the outlined ${hint.clueValue}. It needs ${plural(hint.clueValue - hint.camerasSeen, "camera")} more and can see exactly ${plural(hint.hiddenSeen, "hidden cell")}, so they are all cameras, including the dashed one.`;
      }
      if (hint.clueValue === 0) {
        return "Look at the outlined 0. No camera can see it, so every hidden cell in its sight lines is safe, including the dashed one.";
      }
      return `Look at the outlined ${hint.clueValue}. It already sees all ${plural(hint.camerasSeen, "camera")} it needs, so every other hidden cell it sees is safe, including the dashed one.`;
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
