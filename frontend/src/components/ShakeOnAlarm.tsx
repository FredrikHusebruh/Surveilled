import { useState } from "react";
import type { AnimationEvent, ReactNode } from "react";
import type { Alarm } from "../hooks/useBoardPlay.ts";

/**
 * Shakes its children once per alarm. The wrapper stays mounted, so the board keeps its focus;
 * the shake class is simply present until that alarm's animation ends. It grows to fill the
 * sheet's spare height, which the board inside sizes itself to.
 */
export function ShakeOnAlarm({ alarm, children }: { alarm: Alarm | null; children: ReactNode }) {
  const [settled, setSettled] = useState<number | null>(null);
  const shaking = alarm !== null && alarm.id !== settled;

  const done = (event: AnimationEvent<HTMLDivElement>) => {
    if (alarm !== null && event.target === event.currentTarget) setSettled(alarm.id);
  };

  return (
    <div onAnimationEnd={done} className={`flex flex-1 basis-0 flex-col ${shaking ? "motion-safe:animate-shake" : ""}`}>
      {children}
    </div>
  );
}
