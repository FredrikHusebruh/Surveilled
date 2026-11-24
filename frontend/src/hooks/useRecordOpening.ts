import { useCallback, useState } from "react";
import type { Level } from "../api/schemas.ts";
import { openFolder } from "../lib/sound.ts";

/** Where an unopened record is: sealed in its folder, being opened, or open as orders to read. */
export type OpeningPhase = "sealed" | "opening" | "briefing";

type Stage = { level: number; phase: Exclude<OpeningPhase, "sealed"> };

/**
 * The client-side steps before a record starts: open the folder (an animation), then read the
 * orders. Nothing here talks to the server; the record and its clock only start when the player
 * presses Start operation. Reloading the page reseals the folder, which costs nothing.
 */
export function useRecordOpening(level: Level | null) {
  const [stage, setStage] = useState<Stage | null>(null);
  const phase: OpeningPhase = level !== null && stage?.level === level.level ? stage.phase : "sealed";

  const open = useCallback(() => {
    if (level === null) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // The folder's sound follows its animation; without the animation the orders are simply fed in.
    if (!reduced) openFolder();
    setStage({ level: level.level, phase: reduced ? "briefing" : "opening" });
  }, [level]);

  const opened = useCallback(() => {
    setStage((current) => (current === null ? null : { ...current, phase: "briefing" }));
  }, []);

  return { phase, open, opened };
}
