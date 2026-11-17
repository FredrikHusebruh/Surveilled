import { useCallback, useEffect, useState } from "react";

const CHARS_PER_TICK = 9;
const TICK_MS = 22;

/**
 * Types `total` characters out over time once `running` is true (about 400 per second). `finish`
 * reveals everything at once. Players who ask for reduced motion get the whole text immediately.
 */
export function useTypewriter(total: number, running: boolean) {
  const [typed, setTyped] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? total : 0,
  );

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(
      () => setTyped((current) => (current >= total ? current : Math.min(total, current + CHARS_PER_TICK))),
      TICK_MS,
    );
    return () => window.clearInterval(timer);
  }, [running, total]);

  const finish = useCallback(() => setTyped(total), [total]);

  return { typed, done: typed >= total, finish };
}
