import type { Ref } from "react";
import type { Daily, Game } from "../api/schemas.ts";
import { OPERATION, SALUTATION, SENDER, SIGN_OFF, reportLetter } from "../game/briefings.ts";
import { formatCountdown, romanNumeral, verdictMessage } from "../game/copy.ts";
import { totalSeconds } from "../game/share.ts";
import { useCountdownToMidnight } from "../hooks/useCountdown.ts";
import type { Message } from "../hooks/useBoardPlay.ts";
import type { StandingState } from "../hooks/useStanding.ts";
import { CoffeeStain } from "./CoffeeStain.tsx";
import { MessageLine } from "./MessageLine.tsx";
import { StandingSection } from "./StandingSection.tsx";

type Props = {
  daily: Daily;
  level: number;
  game: Game;
  streakDays: number;
  /** How the finished day compares with everyone else's; idle while the day is in play. */
  standing: StandingState;
  /** Feedback such as "Result copied", shown on the report since it takes the record's place. */
  message: Message;
  /** Focused when the report comes up, so a screen reader reads it (`useSideSheet`). */
  headingRef: Ref<HTMLHeadingElement>;
};

/**
 * The verdict once a record closes, as a typewritten report from the Archivist, fed into the
 * typewriter in the record's place: letterhead, the verdict stamp ("Rectified", "Toppled" or "Seen"), a short
 * letter, the result line and, once the day is over, the standing among everyone who finished
 * the same day and the countdown. Its actions (Next record, Share result, Back to record) are on
 * the machine's bars. The share card itself isn't shown: Share result copies it. The reports
 * that close the day ("Seen" and "Toppled") carry the coffee ring. Its one primary action moves
 * the player on: the next record, or sharing the day's result.
 */
export function Report({ daily, level, game, streakDays, standing, message, headingRef }: Props) {
  const isFinal = level === daily.levels.length;
  const dayOver = daily.outcome !== "playing";
  const verdict = game.status === "lost" ? "Seen" : isFinal ? "Toppled" : "Rectified";
  const outcome = game.status === "lost" ? "seen" : isFinal ? "toppled" : "filed";
  const name = daily.levels[level - 1]?.name ?? "";

  return (
    <article className="relative overflow-hidden px-(--space-4) py-(--space-4) text-[14px] leading-[1.55] sm:px-(--space-5)">
      <header className="grid gap-0.5 text-[13px] tracking-[0.06em] uppercase">
        <h2 ref={headingRef} tabIndex={-1} className="font-bold focus:outline-none">
          {OPERATION}
        </h2>
        <p>
          Report · Assignment {romanNumeral(level - 1)} of {romanNumeral(daily.levels.length - 1)} · {name}
        </p>
        <p>Day {daily.dayNumber}</p>
        <p>From: {SENDER}</p>
      </header>

      <hr className="my-(--space-4) border-t border-dashed border-ink" />

      <div className="grid gap-(--space-3)">
        <div className="w-max origin-left -rotate-3 border-3 border-party px-2 pt-1 pb-0.5 font-stencil text-[40px] leading-[0.9] font-black text-party uppercase">
          {verdict}
        </div>
        <p>{SALUTATION}</p>
        {reportLetter(outcome).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p>{verdictMessage(game, isFinal, totalSeconds(daily))}</p>
        {dayOver && daily.outcome === "toppled" && streakDays >= 2 && (
          <p className="font-bold">Toppled {streakDays} days running.</p>
        )}
        <p className="text-right">— {SIGN_OFF}</p>
        {dayOver && <StandingSection state={standing} />}
      </div>

      <hr className="my-(--space-4) border-t border-dashed border-ink" />

      <footer className="grid gap-(--space-3)">
        {message.text !== "" && <MessageLine message={message} />}
        {dayOver && <NextRecordsIn />}
      </footer>

      {/* The day's last report has had a long night on someone's drawing board. */}
      {dayOver && <CoffeeStain className="absolute -top-[72px] -right-[22%] w-[62%] max-w-[290px] rotate-12" />}
    </article>
  );
}

function NextRecordsIn() {
  const remaining = useCountdownToMidnight();
  return (
    <p className="text-[13px] text-muted">
      New records in{" "}
      <span className="font-condensed text-[18px] font-extrabold tabular-nums text-ink">{formatCountdown(remaining)}</span>
    </p>
  );
}
