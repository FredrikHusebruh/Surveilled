import type { Standing } from "../api/schemas.ts";
import { formatClock, romanNumeral } from "../game/copy.ts";

type Bar = { count: number; tip: string };

/**
 * A small bar chart of where the player sits among everyone who finished the same day. After
 * toppling, it is the spread of toppled players' scores (fast on the left); after being seen, it
 * is how far every player got. The player's bar is solid ink with a "You" label; the rest are
 * faint ink. Bars are square (design rule 4) and the chart is described in text for screen readers.
 */
export function StandingChart({ standing }: { standing: Standing }) {
  const toppled = standing.levelsFiled === standing.reached.length - 1;
  const { bars, mine, title, from, to } = toppled ? scoreBars(standing) : reachBars(standing);
  const tallest = Math.max(1, ...bars.map((bar) => bar.count));

  return (
    <figure className="grid gap-(--space-1)">
      <figcaption className="text-[12px] tracking-[0.06em] text-muted uppercase">{title}</figcaption>
      <div
        role="img"
        aria-label={`${title}. You are in the ${toppled ? "highlighted score band" : "highlighted group"}: ${bars[mine]?.tip ?? ""}.`}
        className="relative flex h-[96px] items-end gap-[2px] border-b border-ink pt-[18px]"
      >
        {bars.map((bar, index) => (
          <div key={index} title={bar.tip} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            {index === mine && <span className="pb-0.5 text-[11px] leading-none font-bold uppercase">You</span>}
            <div
              className={`w-full ${index === mine ? "bg-ink" : "bg-ink/25"}`}
              // The one dynamic value: each bar's height.
              style={{ height: `${Math.max(bar.count > 0 ? 4 : 0, (bar.count / tallest) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[12px] text-muted">
        <span>{from}</span>
        <span>{to}</span>
      </div>
    </figure>
  );
}

function scoreBars(standing: Standing) {
  const { lowSeconds, highSeconds, counts } = standing.curve;
  const width = (highSeconds - lowSeconds) / counts.length;
  const bars = counts.map((count, index) => {
    const start = Math.round(lowSeconds + index * width);
    const end = Math.round(lowSeconds + (index + 1) * width);
    return { count, tip: `${count} ${count === 1 ? "clerk" : "clerks"} scored ${formatClock(start)} to ${formatClock(end)}` };
  });
  const position = Math.floor((standing.scoreSeconds - lowSeconds) / width);
  return {
    bars,
    mine: Math.min(counts.length - 1, Math.max(0, position)),
    title: "Scores of clerks who toppled it",
    from: `${formatClock(lowSeconds)} faster`,
    to: `slower ${formatClock(highSeconds)}`,
  };
}

function reachBars(standing: Standing) {
  const last = standing.reached.length - 1;
  const bars: Bar[] = standing.reached.map((count, filed) => {
    const label = filed === last ? "Toppled" : `Seen on ${romanNumeral(filed)}`;
    return { count, tip: `${label}: ${count} ${count === 1 ? "clerk" : "clerks"}` };
  });
  return {
    bars,
    mine: standing.levelsFiled,
    title: "How far clerks got today",
    from: "Seen on I",
    to: "Toppled",
  };
}
