import { useDevCubicles } from "../hooks/useDevCubicles.ts";
import { Button } from "./Button.tsx";

/**
 * Developer tools, rendered only in Vite dev builds (`import.meta.env.DEV`), so they never ship.
 * The reset also needs SURVEILLED_DEV_MODE=true on the backend, which answers 404 otherwise.
 * The cubicles toggle is client-only and draws the board cells as office cubicles.
 */
export function DevTools({ onReset }: { onReset: () => void }) {
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
    </section>
  );
}
