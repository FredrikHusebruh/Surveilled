import { useEffect, useState } from "react";
import { msUntilLocalMidnight } from "../lib/localDay.ts";

/** Milliseconds until the next day's records open (local midnight), ticking once a second. */
export function useCountdownToMidnight(): number {
  const [remaining, setRemaining] = useState(msUntilLocalMidnight);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(msUntilLocalMidnight()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return remaining;
}
