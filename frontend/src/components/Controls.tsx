import type { HintKind } from "../api/schemas.ts";
import { HINT_KINDS, HINT_TALLY, HINTS, hintButtonLabel, type HintState } from "../game/copy.ts";
import { Button } from "./Button.tsx";

type Props = {
  /** The kinds of hint left today, or "free" in training, where every kind is unlimited. */
  hints: readonly HintKind[] | "free";
  /** Open was pressed and the player is choosing a cell. */
  opening: boolean;
  onHint: (kind: HintKind) => void;
};

/**
 * The three hints under the board, one of each a day: Open (the player picks a cell to open),
 * Camera and Safe cell. A used one is disabled until tomorrow; in training they are free. A tap
 * clears and the mark gesture marks, so there is no mode to switch, and no restart: each record
 * gets one attempt per day. None of these is primary: that belongs to the verdict.
 */
export function Controls({ hints, opening, onHint }: Props) {
  return (
    <div className="flex items-stretch gap-(--space-2)">
      {HINT_KINDS.map((kind) => {
        const state: HintState = hints === "free" ? "free" : hints.includes(kind) ? "left" : "used";
        const pressed = kind === "open" && opening;
        return (
          <Button
            key={kind}
            className="flex-1 flex-col gap-(--space-1) px-1"
            pressed={pressed}
            disabled={state === "used"}
            aria-pressed={kind === "open" ? opening : undefined}
            aria-label={hintButtonLabel(kind, state)}
            onClick={() => onHint(kind)}
          >
            {HINTS[kind].label}
            <span aria-hidden="true" className="text-[11px] font-normal">
              {HINT_TALLY[state]}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
