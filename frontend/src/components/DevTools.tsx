import type { Level } from "../api/schemas.ts";
import { romanNumeral } from "../game/copy.ts";
import { useDevCubicles } from "../hooks/useDevCubicles.ts";
import { Button } from "./Button.tsx";

type Props = {
  onReset: () => void;
  /** The day's levels, to jump between them. */
  levels: readonly Level[];
  current: number | null;
  onViewLevel: (level: number) => void;
};

/**
 * Developer tools, rendered only in Vite dev builds (`import.meta.env.DEV`), so they never ship.
 * The reset also needs SURVEILLED_DEV_MODE=true on the backend, which answers 404 otherwise.
 * In dev mode the server opens every level at once, and the level row jumps straight to any of
 * them, even from a sealed folder, where the level tabs aren't shown. The cubicles toggle is
 * client-only and draws the board cells as office cubicles.
 */
export function DevTools({ onReset, levels, current, onViewLevel }: Props) {
  const cubicles = useDevCubicles();
  return (
    <section aria-label="Developer tools" className="grid justify-items-start gap-(--space-2) border-t border-dashed border-ink pt-(--space-3)">
      <p className="text-[12px] tracking-[0.12em] text-muted uppercase">Developer tools</p>
      <div className="flex flex-wrap gap-(--space-2)">
        <Button onClick={onReset}>Reset today</Button>
        <Button aria-pressed={cubicles.on} onClick={cubicles.toggle}>
          {cubicles.on ? "Hide cubicles" : "Show cubicles"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-(--space-2)">
        {levels.map((level, index) => (
          <Button
            key={level.level}
            pressed={level.level === current}
            aria-pressed={level.level === current}
            disabled={level.state === "locked"}
            onClick={() => onViewLevel(level.level)}
          >
            Level {romanNumeral(index)}
          </Button>
        ))}
      </div>
    </section>
  );
}
