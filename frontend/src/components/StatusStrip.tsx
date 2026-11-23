import type { ReactNode } from "react";
import type { Game } from "../api/schemas.ts";
import { unmarkedCameraCount } from "../game/board.ts";
import { formatClock } from "../game/copy.ts";
import { useElapsedSeconds } from "../hooks/useElapsedSeconds.ts";
import { CameraIcon } from "./CameraIcon.tsx";

const RATING_STEPS = [1, 2, 3, 4, 5] as const;

type Props = {
  game: Game;
  receivedAt: number;
  /** Shown at the right end of the clock row: the "?" for the rules. */
  aside?: ReactNode;
  /** A training record: untimed and unrated, so only the counts row shows. */
  training?: boolean;
};

/**
 * Between two ink rules: unmarked cameras, strikes and difficulty on the first row; the clock and
 * `aside` on the second. Fixed rows, so the clock and the "?" sit in the same place at every width.
 * A training record shows only unmarked cameras and strikes.
 */
export function StatusStrip({ game, receivedAt, aside, training = false }: Props) {
  return (
    <section aria-label="Record status" className="grid gap-(--space-2) border-y border-ink py-(--space-2) text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-(--space-3)">
        <span className="flex items-center gap-(--space-2)">
          Unmarked cameras <Figure>{unmarkedCameraCount(game)}</Figure>
        </span>
        <span className="flex items-center gap-(--space-2)">
          Strikes
          <span className="flex gap-[3px]" role="img" aria-label={`${game.strikes} of ${game.maxStrikes}`}>
            {Array.from({ length: game.maxStrikes }, (_, k) => (
              <CameraIcon key={k} className={`size-5 ${k < game.strikes ? "text-party" : "text-muted opacity-45"}`} />
            ))}
          </span>
        </span>
        {!training && (
          <span className="tracking-[1px]" role="img" aria-label={`Difficulty ${game.rating} of 5`}>
            Difficulty{" "}
            {RATING_STEPS.map((step) => (
              <span key={step} className={step <= game.rating ? "text-ink" : "text-muted opacity-40"}>
                &#9632;
              </span>
            ))}
          </span>
        )}
      </div>
      {!training && (
        <div className="flex items-center justify-between gap-(--space-3)">
          <Clock game={game} receivedAt={receivedAt} />
          {aside}
        </div>
      )}
    </section>
  );
}

function Clock({ game, receivedAt }: { game: Game; receivedAt: number }) {
  const seconds = useElapsedSeconds(game.elapsedSeconds, receivedAt, game.status === "play");
  return <Figure label="Time">{formatClock(seconds)}</Figure>;
}

function Figure({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <span aria-label={label} className="font-condensed text-[22px] leading-none font-extrabold tabular-nums">
      {children}
    </span>
  );
}
