import type { Level } from "../api/schemas.ts";
import type { LevelsFrame } from "../game/tutorial.ts";
import { DemoStamp } from "./DemoStamp.tsx";
import { LevelTabs } from "./LevelTabs.tsx";

/**
 * The day's progression as a demo: the real level tabs filing one by one, then the final stamp.
 * Inert and hidden from assistive tech, like every demo.
 */
export function DemoLevels({ frame, levelNames }: { frame: LevelsFrame; levelNames: string[] }) {
  const levels: Level[] = frame.states.map((state, index) => ({
    level: index + 1,
    name: levelNames[index] ?? "",
    brief: "",
    state,
    game: null,
  }));
  const current = levels.find((level) => level.state === "open")?.level ?? null;

  return (
    <div className="relative py-(--space-4)" inert aria-hidden="true">
      <LevelTabs levels={levels} current={current} onView={() => undefined} />
      {frame.verdict !== undefined && <DemoStamp key={frame.verdict} verdict={frame.verdict} />}
    </div>
  );
}
