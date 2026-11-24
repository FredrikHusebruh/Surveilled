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
  /** A training record: untimed and unrated, so only the counts show. */
  training?: boolean;
};

/**
 * One typed row under a dashed rule: cameras left unmarked, strikes, difficulty and the clock at the
 * right end. Labels in typewriter, figures in condensed digits (design rule 7). On narrow screens
 * the word "Difficulty" gives way to its squares. A training record shows only the counts.
 */
export function StatusStrip({ game, receivedAt, training = false }: Props) {
  return (
    <section
      aria-label="Record status"
      className="flex items-center justify-between gap-(--space-3) border-t border-dashed border-ink pt-(--space-2) text-[12px] leading-none"
    >
      <span className="flex items-center gap-1.5">
        Cameras left <Figure>{unmarkedCameraCount(game)}</Figure>
      </span>
      <span className="flex items-center gap-1.5">
        Strikes
        <span className="flex gap-0.5" role="img" aria-label={`${game.strikes} of ${game.maxStrikes}`}>
          {Array.from({ length: game.maxStrikes }, (_, k) => (
            <CameraIcon key={k} className={`size-4 ${k < game.strikes ? "text-party" : "text-muted opacity-45"}`} />
          ))}
        </span>
      </span>
      {!training && (
        <>
          <span className="flex items-center gap-1.5" role="img" aria-label={`Difficulty ${game.rating} of 5`}>
            <span className="max-[420px]:hidden">Difficulty</span>
            <span className="tracking-[1px]">
              {RATING_STEPS.map((step) => (
                <span key={step} className={step <= game.rating ? "text-ink" : "text-muted opacity-40"}>
                  &#9632;
                </span>
              ))}
            </span>
          </span>
          <Clock game={game} receivedAt={receivedAt} />
        </>
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
    <span aria-label={label} className="font-condensed text-[19px] leading-none font-extrabold tabular-nums">
      {children}
    </span>
  );
}
