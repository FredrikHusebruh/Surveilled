import { useCallback, useEffect, useState } from "react";

const STEP_MS = 1800;
const HOLD_LAST_MS = 3000;

/**
 * Steps through a demo's frames on a timer, looping, and lingers on the last frame. It starts
 * paused for players who ask for reduced motion, and can always be paused (WCAG 2.2.2).
 * Remount it (with a `key`) to restart from the first frame.
 */
export function useDemoPlayer(frameCount: number) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (!playing || frameCount < 2) return;
    const delay = frame === frameCount - 1 ? HOLD_LAST_MS : STEP_MS;
    const timer = window.setTimeout(() => setFrame((current) => (current + 1) % frameCount), delay);
    return () => window.clearTimeout(timer);
  }, [frame, frameCount, playing]);

  const togglePlaying = useCallback(() => setPlaying((current) => !current), []);

  return { frame, playing, togglePlaying };
}
