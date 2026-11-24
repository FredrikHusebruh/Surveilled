import type { Level, LevelState } from "../api/schemas.ts";
import { LEVEL_STATE_LABELS, romanNumeral } from "../game/copy.ts";

type Props = {
  levels: Level[];
  current: number | null;
  onView: (level: number) => void;
};

/** The share card's marks, so the tabs and the card read alike: ■ filed, □ seen. */
const STATE_MARKS: Partial<Record<LevelState, string>> = { filed: "■", seen: "□" };

/**
 * The second typed line: the day's four levels as tab stops. The current one is typed in an
 * inverted box with its name; the others show their numeral and a mark (■ filed, □ seen in red).
 * Locked levels are faint and can't be opened. Each tab is 44px tall to the finger, though the
 * line is only as tall as its type.
 */
export function LevelTabs({ levels, current, onView }: Props) {
  return (
    <nav aria-label="Today's records" className="flex items-center gap-(--space-2) text-[12px] leading-none">
      {levels.map((level, index) => {
        const isCurrent = level.level === current;
        const mark = STATE_MARKS[level.state];
        return (
          <button
            key={level.level}
            type="button"
            aria-current={isCurrent ? "true" : undefined}
            aria-label={`Record ${romanNumeral(index)}, ${level.name}, ${LEVEL_STATE_LABELS[level.state]}`}
            disabled={level.state === "locked"}
            onClick={() => onView(level.level)}
            className="group -my-3 flex min-w-11 cursor-pointer justify-center py-3 focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-party focus-visible:outline-solid disabled:cursor-default"
          >
            <span
              className={`flex items-baseline gap-1.5 px-1.5 py-1 group-disabled:opacity-40 ${isCurrent ? "bg-ink text-paper" : "group-enabled:group-hover:underline"}`}
            >
              <span className="font-bold tracking-[0.06em]">{romanNumeral(index)}</span>
              {isCurrent && <span className="whitespace-nowrap">{level.name}</span>}
              {mark !== undefined && (
                <span className={level.state === "seen" && !isCurrent ? "text-party-text" : ""}>{mark}</span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
