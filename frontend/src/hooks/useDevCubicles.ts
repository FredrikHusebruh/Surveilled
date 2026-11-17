import { useCallback, useEffect, useState } from "react";

/**
 * The dev-only switch for the cubicle floor plan on the board. It marks <html> with
 * `data-cubicles`, which the `cubicles` Tailwind variant reads, so every board (the record and the
 * How to play demos) follows it without a prop. Kept in memory only: a reload turns it off.
 */
export function useDevCubicles() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (on) root.dataset.cubicles = "";
    else delete root.dataset.cubicles;
  }, [on]);

  const toggle = useCallback(() => setOn((current) => !current), []);
  return { on, toggle };
}
