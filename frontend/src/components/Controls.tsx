import type { ReactNode } from "react";
import type { TapMode } from "../hooks/useDaily.ts";
import { hintButtonLabel } from "../game/copy.ts";
import { Button } from "./Button.tsx";
import { CameraIcon } from "./CameraIcon.tsx";

type Props = {
  mode: TapMode;
  onModeChange: (mode: TapMode) => void;
  /** Hints the player may still take today, out of `hintsPerDay`, across all levels. */
  hintsLeft: number;
  hintsPerDay: number;
  onHint: () => void;
};

/**
 * The tap-mode toggle and Hint. There is no restart: each record gets one attempt per day.
 * Hint shows the day's hints as squares, solid for each one left, and is disabled once they are
 * spent.
 * None of these is primary: that belongs to the verdict.
 */
export function Controls({ mode, onModeChange, hintsLeft, hintsPerDay, onHint }: Props) {
  return (
    <div className="flex flex-wrap items-stretch gap-(--space-2)">
      <div role="group" aria-label="What a tap does" className="flex flex-[3] border-[1.5px] border-ink">
        <ModeButton pressed={mode === "clear"} onClick={() => onModeChange("clear")}>
          Clear cell
        </ModeButton>
        <ModeButton pressed={mode === "mark"} onClick={() => onModeChange("mark")} divided>
          <CameraIcon className="size-[18px]" />
          Mark camera
        </ModeButton>
      </div>
      <Button
        className="flex-1 flex-col"
        disabled={hintsLeft === 0}
        aria-label={hintButtonLabel(hintsLeft, hintsPerDay)}
        onClick={onHint}
      >
        Hint
        <HintTally left={hintsLeft} total={hintsPerDay} />
      </Button>
    </div>
  );
}

type ModeButtonProps = {
  pressed: boolean;
  divided?: boolean;
  onClick: () => void;
  children: ReactNode;
};

function ModeButton({ pressed, divided = false, onClick, children }: ModeButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex flex-1 cursor-pointer items-center justify-center gap-(--space-2) px-3 py-2.5 text-[14px] font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-party focus-visible:outline-solid ${divided ? "border-l-[1.5px] border-ink" : ""} ${pressed ? "bg-ink text-paper" : "bg-paper text-ink"}`}
    >
      {children}
    </button>
  );
}

/** One small square per hint of the day: solid while it is left, an empty box once used. */
function HintTally({ left, total }: { left: number; total: number }) {
  return (
    <span aria-hidden="true" className="flex gap-(--space-1)">
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={`size-2 border-[1.5px] border-ink ${index < left ? "bg-ink" : ""}`} />
      ))}
    </span>
  );
}
