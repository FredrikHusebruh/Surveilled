/** Local calendar days as YYYY-MM-DD. The daily game turns over at each player's own midnight. */

const pad = (n: number): string => String(n).padStart(2, "0");

/** The player's local date. */
export function localDay(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Milliseconds until the next local midnight. */
export function msUntilLocalMidnight(now: Date = new Date()): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}

/** The calendar day before `day`. Calendar arithmetic only, so time zones can't shift it. */
export function previousDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new RangeError(`Not a date: ${day}`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
