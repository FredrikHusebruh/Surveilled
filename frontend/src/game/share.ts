import type { Daily, Level, Standing } from "../api/schemas.ts";
import { formatClock, plural, romanNumeral, standingShareLine } from "./copy.ts";

/**
 * The spoiler-free result card players paste into chats (design.md, "Growth and money surfaces").
 * Plain text only: no emoji, no board positions. Example:
 *
 *   SURVEILLED · Day 34
 *   I   ■ 00:48
 *   II  ■ 02:15
 *   III ■ 05:02 · 1 strike
 *   IV  ■ 11:40 · 2 hints
 *   REGIME TOPPLED · 20:45
 *   Score 22:45 · top 8% of 1,204 insiders
 *   Toppled 3 days running
 *   https://example.org
 */
export function shareText(daily: Daily, streakDays: number, link: string, standing: Standing | null): string {
  const lines = [`SURVEILLED · Day ${daily.dayNumber}`];
  lines.push(...daily.levels.map((level, index) => levelLine(level, index)));
  lines.push(verdictLine(daily));
  if (standing !== null) lines.push(standingShareLine(standing));
  if (daily.outcome === "toppled" && streakDays >= 2) lines.push(`Toppled ${streakDays} days running`);
  lines.push(link);
  return lines.join("\n");
}

/** Seconds spent across every opened record of the day. */
export function totalSeconds(daily: Daily): number {
  return daily.levels.reduce((sum, level) => sum + (level.game?.elapsedSeconds ?? 0), 0);
}

function levelLine(level: Level, index: number): string {
  const numeral = romanNumeral(index).padEnd(3, " ");
  const game = level.game;
  if (level.state === "seen") return `${numeral} □ Seen`;
  if (level.state !== "filed" || game === null) return `${numeral} □`;
  const extras = [
    game.strikes > 0 ? plural(game.strikes, "strike") : null,
    game.hints > 0 ? plural(game.hints, "hint") : null,
  ].filter((part) => part !== null);
  return [`${numeral} ■ ${formatClock(game.elapsedSeconds)}`, ...extras].join(" · ");
}

function verdictLine(daily: Daily): string {
  if (daily.outcome === "toppled") return `REGIME TOPPLED · ${formatClock(totalSeconds(daily))}`;
  const seenAt = daily.levels.findIndex((level) => level.state === "seen");
  if (seenAt >= 0) return `SEEN ON LEVEL ${romanNumeral(seenAt)}`;
  return "UNDER OBSERVATION";
}
