import { useState } from "react";
import type { AnimationEvent } from "react";
import {
  DESTROY_NOTE,
  OPERATION,
  RECIPIENT,
  SALUTATION,
  SENDER,
  SIGN_OFF,
  briefingFor,
} from "../game/briefings.ts";
import { FOLDER, TRAINING, forPointer } from "../game/copy.ts";
import { usePointer } from "../hooks/usePointer.ts";
import { useTypewriter } from "../hooks/useTypewriter.ts";
import { Button } from "./Button.tsx";
import { CoffeeStain } from "./CoffeeStain.tsx";

type Props = {
  dayNumber: number;
  level: number;
  numeral: string;
  total: string;
  name: string;
  brief: string;
  pending: boolean;
  onStart: () => void;
  /** Put this level's training first: its rules are new to the player. */
  trainingFirst: boolean;
  /** Plays this level's training record. */
  onTraining: () => void;
  /** Goes straight to Start operation without training. */
  onSkipTraining: () => void;
};

/**
 * The operation orders from inside the folder: a typewritten letter that unfolds, then types
 * itself out (tap the page to finish). The story first, then the orders for this level, then Start
 * operation, which is what starts the record's clock, beside Training, which plays this level's
 * training record. While the level's rules are new, Start training comes first instead, with Skip
 * training beside it. Reading is never timed.
 */
export function Briefing({
  dayNumber,
  level,
  numeral,
  total,
  name,
  brief,
  pending,
  onStart,
  trainingFirst,
  onTraining,
  onSkipTraining,
}: Props) {
  const { backstory, orders } = briefingFor(level);
  const pointer = usePointer();
  const [unfolded, setUnfolded] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const header = [
    OPERATION,
    `Assignment ${numeral} of ${total} · ${name}`,
    `Day ${dayNumber}`,
    `From: ${SENDER}`,
    `To: ${RECIPIENT}`,
  ];
  const numberedOrders = [brief, ...orders].map((order, index) => `${index + 1}. ${forPointer(order, pointer)}`);
  const page = typeset([header, [SALUTATION, ...backstory], ["Orders"], numberedOrders, [`— ${SIGN_OFF}`]]);
  const [headerLines, letterLines, [ordersTitle], orderLines, [signOff]] = page.sections;
  const { typed, done, finish } = useTypewriter(page.total, unfolded);
  const type = (line: Line) => <Typed text={line.text} start={line.start} typed={typed} />;

  const unfoldDone = (event: AnimationEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) setUnfolded(true);
  };

  return (
    <article
      aria-label={`${OPERATION}, assignment ${numeral}`}
      aria-busy={!done}
      onClick={finish}
      onAnimationEnd={unfoldDone}
      className="relative origin-top overflow-hidden border-[1.5px] border-ink bg-paper px-(--space-5) py-(--space-5) text-[14px] leading-[1.55] motion-safe:animate-unfold"
    >
      {/* The creases of a letter folded in three. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-ink/10" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-ink/10" />

      <span className="absolute top-(--space-4) right-(--space-4) rotate-6 border-2 border-party bg-paper px-2 pt-1 pb-0.5 font-stencil text-[20px] leading-none font-black text-party uppercase motion-safe:animate-thunk">
        {FOLDER.stamp}
      </span>

      <header className="grid gap-0.5 pr-[96px] text-[13px] tracking-[0.06em] uppercase">
        {headerLines.map((line, index) => (
          <p key={line.start} className={index === 0 ? "font-bold" : ""}>
            {type(line)}
          </p>
        ))}
      </header>

      <hr className="my-(--space-4) border-t border-dashed border-ink" />

      <div className="grid gap-(--space-3)">
        {letterLines.map((line) => (
          <p key={line.start}>{type(line)}</p>
        ))}
        <p className="mt-(--space-2) font-bold tracking-[0.12em] uppercase">{type(ordersTitle)}</p>
        {orderLines.map((line) => (
          <p key={line.start} className="pl-[2ch] -indent-[2ch]">
            {type(line)}
          </p>
        ))}
        <p className="text-right">{type(signOff)}</p>
      </div>

      <hr className="my-(--space-4) border-t border-dashed border-ink" />

      <footer className="grid gap-(--space-3)">
        <p className="text-[12px] text-muted">{DESTROY_NOTE}</p>
        <div className="flex gap-(--space-2)">
          {trainingFirst ? (
            <>
              <Button primary className="flex-1" onClick={onTraining}>
                {TRAINING.start}
              </Button>
              <Button className="flex-1" onClick={onSkipTraining}>
                {TRAINING.skip}
              </Button>
            </>
          ) : (
            <>
              <Button primary className="flex-1" onClick={onStart} disabled={pending}>
                Start operation
              </Button>
              <Button className="flex-1" onClick={onTraining}>
                {TRAINING.open}
              </Button>
            </>
          )}
        </div>
      </footer>

      {/* Someone set their cup down on these orders: in the top corner, clear of the story. */}
      <CoffeeStain className="absolute -top-[72px] -right-[22%] w-[62%] max-w-[290px] rotate-12" />
    </article>
  );
}

/**
 * The typed part of a line, a block cursor on the next character, and the rest laid out but
 * invisible, so the page never reflows while it types.
 */
function Typed({ text, start, typed }: { text: string; start: number; typed: number }) {
  const shown = Math.max(0, Math.min(text.length, typed - start));
  const typing = shown > 0 && shown < text.length;
  return (
    <>
      {text.slice(0, shown)}
      {typing && (
        <span aria-hidden="true" className="bg-ink text-transparent">
          {text[shown]}
        </span>
      )}
      <span aria-hidden="true" className="invisible">
        {text.slice(typing ? shown + 1 : shown)}
      </span>
    </>
  );
}

type Line = { text: string; start: number };

/**
 * Lays the document's sections out end to end for the typewriter: each line gets the character
 * offset at which typing reaches it.
 */
function typeset(sections: string[][]): { sections: Line[][]; total: number } {
  let offset = 0;
  const laidOut = sections.map((lines) =>
    lines.map((text) => {
      const line = { text, start: offset };
      offset += text.length;
      return line;
    }),
  );
  return { sections: laidOut, total: offset };
}
