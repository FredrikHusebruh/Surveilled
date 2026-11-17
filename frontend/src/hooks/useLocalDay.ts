import { useEffect, useState } from "react";
import { localDay, msUntilLocalMidnight } from "../lib/localDay.ts";

/**
 * The player's local date, updated at local midnight. It is also re-read when the tab becomes
 * visible again, because timers don't fire while a laptop sleeps through midnight.
 */
export function useLocalDay(): string {
  const [day, setDay] = useState(localDay);

  useEffect(() => {
    let timer = 0;
    const sync = () => setDay(localDay());
    const schedule = () => {
      timer = window.setTimeout(() => {
        sync();
        schedule();
      }, msUntilLocalMidnight() + 1000);
    };
    schedule();
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return day;
}
