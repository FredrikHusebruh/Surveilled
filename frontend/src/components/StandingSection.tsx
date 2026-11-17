import type { Standing } from "../api/schemas.ts";
import { STANDING_LOADING, formatClock, scoreLines, standingHeadline, standingTooFew } from "../game/copy.ts";
import type { StandingState } from "../hooks/useStanding.ts";
import { StandingChart } from "./StandingChart.tsx";

/**
 * The end-of-day comparison on the day's last report: a headline ("Top 8% of clerks today."),
 * the chart and a receipt of how the score was made.
 */
export function StandingSection({ state }: { state: StandingState }) {
  if (state.status === "idle") return null;
  return (
    <section aria-labelledby="standing-title" aria-live="polite" className="grid gap-(--space-2)">
      <h3 id="standing-title" className="text-[13px] font-bold tracking-[0.06em] uppercase">
        Standing
      </h3>
      {state.status === "loading" && <p className="text-muted">{STANDING_LOADING}</p>}
      {state.status === "unavailable" && <p className="text-muted">{state.reason}</p>}
      {state.status === "ready" && (
        <>
          {state.standing.comparable ? (
            <>
              <p className="font-stencil text-[26px] leading-none font-black uppercase">
                {standingHeadline(state.standing)}
              </p>
              <StandingChart standing={state.standing} />
            </>
          ) : (
            <p>{standingTooFew(state.standing)}</p>
          )}
          <ScoreReceipt standing={state.standing} />
        </>
      )}
    </section>
  );
}

/** Time, each penalty, then the score: a short receipt, digits right-aligned. */
function ScoreReceipt({ standing }: { standing: Standing }) {
  return (
    <dl className="grid w-max grid-cols-[auto_auto] gap-x-(--space-5) text-[14px]">
      {scoreLines(standing).map((line) => (
        <div key={line.label} className="contents">
          <dt>{line.label}</dt>
          <dd className="text-right font-condensed text-[18px] font-extrabold tabular-nums">{line.value}</dd>
        </div>
      ))}
      <div aria-hidden="true" className="col-span-2 my-0.5 border-t border-ink" />
      <div className="contents">
        <dt className="font-bold">Score</dt>
        <dd className="text-right font-condensed text-[18px] font-extrabold tabular-nums">
          {formatClock(standing.totalSeconds)}
        </dd>
      </div>
    </dl>
  );
}
