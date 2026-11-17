import { useState } from "react";
import type { AnimationEvent } from "react";
import type { Alarm } from "../hooks/useDaily.ts";

/**
 * The alarm when a camera sees the player. A strike pulses a red glow around the screen's edge
 * once. A loss runs the siren: red and blue police lights alternating from the top corners for
 * about three seconds. Pure light: it never blocks input, and it is not rendered at all for players
 * who ask for reduced motion.
 */
export function AlarmOverlay({ alarm }: { alarm: Alarm | null }) {
  const [finished, setFinished] = useState<number | null>(null);
  if (alarm === null || alarm.id === finished) return null;

  const done = (event: AnimationEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) setFinished(alarm.id);
  };

  if (alarm.kind === "strike") {
    return (
      <div
        key={alarm.id}
        aria-hidden="true"
        onAnimationEnd={done}
        className="pointer-events-none fixed inset-0 z-50 hidden opacity-0 shadow-[inset_0_0_90px_24px_var(--party)] motion-safe:block motion-safe:animate-alarm"
      />
    );
  }

  return (
    <div key={alarm.id} aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 hidden motion-safe:block">
      <div
        onAnimationEnd={done}
        className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,var(--party)_0%,transparent_55%)] opacity-0 motion-safe:animate-siren-red"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,var(--siren)_0%,transparent_55%)] opacity-0 motion-safe:animate-siren-blue" />
      <div className="absolute inset-x-0 top-0 grid h-2 grid-cols-2">
        <span className="bg-party opacity-0 motion-safe:animate-siren-red" />
        <span className="bg-siren opacity-0 motion-safe:animate-siren-blue" />
      </div>
    </div>
  );
}
