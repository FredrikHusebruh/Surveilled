import { z } from "zod";
import { previousDay } from "../lib/localDay.ts";

export const streakSchema = z.object({
  lastToppled: z.iso.date().nullable(),
  days: z.number().int().nonnegative(),
});
export type Streak = z.infer<typeof streakSchema>;

export const NO_STREAK: Streak = { lastToppled: null, days: 0 };

/**
 * The streak after toppling the government on `day`: one more if the last topple was the day
 * before, unchanged if it was already counted today, otherwise a fresh streak of one.
 */
export function afterToppling(streak: Streak, day: string): Streak {
  if (streak.lastToppled === day) return streak;
  const continues = streak.lastToppled !== null && streak.lastToppled === previousDay(day);
  return { lastToppled: day, days: continues ? streak.days + 1 : 1 };
}

/** The streak as of `today`: a streak whose last topple is older than yesterday has lapsed. */
export function currentStreak(streak: Streak, today: string): number {
  if (streak.lastToppled === null) return 0;
  const alive = streak.lastToppled === today || streak.lastToppled === previousDay(today);
  return alive ? streak.days : 0;
}
