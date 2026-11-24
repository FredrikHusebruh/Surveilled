import type { HintKind } from "../api/schemas.ts";
import { HINT_KINDS, HINT_USED, HINTS, hintButtonLabel, type HintState } from "../game/copy.ts";
import { HintIcon } from "./HintIcon.tsx";
import { TypeKey } from "./TypeKey.tsx";

type Props = {
  /** The kinds of hint left today, or "free" in training, where every kind is unlimited. */
  hints: readonly HintKind[] | "free";
  /** Open was pressed and the player is choosing a cell. */
  opening: boolean;
  onHint: (kind: HintKind) => void;
};

/**
 * The three hints as keys on the typewriter, one of each a day, each a symbol over a small word:
 * Open (a magnifying glass; the player picks a cell to open, and the key stays down until they
 * do), Camera (shows a camera) and Safe (the camera struck through; shows a safe cell). A used one
 * reads "Used" and is dead until tomorrow; in training they are free. A tap clears and the mark
 * gesture marks, so there is no mode to switch, and no restart: each record gets one attempt per
 * day.
 */
export function Controls({ hints, opening, onHint }: Props) {
  return (
    <>
      {HINT_KINDS.map((kind) => {
        const state: HintState = hints === "free" ? "free" : hints.includes(kind) ? "left" : "used";
        return (
          <TypeKey
            key={kind}
            symbol={<HintIcon kind={kind} className="size-6" />}
            label={state === "used" ? HINT_USED : HINTS[kind].label}
            down={kind === "open" && opening}
            disabled={state === "used"}
            aria-pressed={kind === "open" ? opening : undefined}
            aria-label={hintButtonLabel(kind, state)}
            onClick={() => onHint(kind)}
          />
        );
      })}
    </>
  );
}
