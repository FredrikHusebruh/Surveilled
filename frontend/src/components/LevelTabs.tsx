import type { Level } from "../api/schemas.ts";
import { LEVEL_STATE_LABELS, romanNumeral } from "../game/copy.ts";

type Props = {
  levels: Level[];
  current: number | null;
  onView: (level: number) => void;
};

/** The day's four levels as tabs: numeral, name and state. Locked levels can't be opened. */
export function LevelTabs({ levels, current, onView }: Props) {
  return (
    <nav aria-label="Today's records" className="grid grid-cols-4 gap-(--space-1)">
      {levels.map((level, index) => {
        const isCurrent = level.level === current;
        const locked = level.state === "locked";
        const stateTone = isCurrent ? "text-concrete" : level.state === "seen" ? "text-party-text" : "text-muted";
        return (
          <button
            key={level.level}
            type="button"
            aria-current={isCurrent ? "true" : undefined}
            disabled={locked}
            onClick={() => onView(level.level)}
            className={`grid cursor-pointer gap-0.5 border-[1.5px] border-ink px-[7px] pt-[7px] pb-2 text-left text-[12px] leading-[1.2] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-party focus-visible:outline-solid disabled:cursor-default disabled:opacity-50 ${isCurrent ? "bg-ink text-paper" : "text-ink"}`}
          >
            <span className="font-stencil text-[20px] leading-none font-black">{romanNumeral(index)}</span>
            <span>{level.name}</span>
            <span className={`text-[11px] ${stateTone}`}>{LEVEL_STATE_LABELS[level.state]}</span>
          </button>
        );
      })}
    </nav>
  );
}
