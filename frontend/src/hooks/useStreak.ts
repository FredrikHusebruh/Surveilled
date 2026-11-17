import { useCallback, useState } from "react";
import { NO_STREAK, afterToppling, currentStreak, streakSchema } from "../game/streak.ts";
import { readStored, writeStored } from "../lib/storage.ts";

/**
 * Consecutive days this browser toppled the government. A per-viewer convenience kept in
 * localStorage: there are no accounts, so the server has no one to count it for.
 */
export function useStreak(today: string) {
  const [streak, setStreak] = useState(() => readStored("streak", streakSchema, NO_STREAK));

  const recordTopple = useCallback(
    (day: string) => {
      const next = afterToppling(streak, day);
      if (next === streak) return;
      setStreak(next);
      writeStored("streak", next);
    },
    [streak],
  );

  return { days: currentStreak(streak, today), recordTopple };
}
