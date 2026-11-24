import {
  DESTROY_NOTE,
  OPERATION,
  RECIPIENT,
  SALUTATION,
  SENDER,
  SIGN_OFF,
  briefingFor,
} from "../game/briefings.ts";
import { FOLDER, forPointer } from "../game/copy.ts";
import { usePointer } from "../hooks/usePointer.ts";
import { CoffeeStain } from "./CoffeeStain.tsx";

type Props = {
  dayNumber: number;
  level: number;
  numeral: string;
  total: string;
  name: string;
  brief: string;
};

/**
 * The operation orders from inside the folder: a finished, typewritten letter laid on the desk,
 * which unfolds as it comes out (two fold creases stay in the paper). The story first, then the
 * orders for this level. It takes the desk's spare height and scrolls inside, so its actions
 * (Start operation, training) stay in view under it. Reading is never timed.
 */
export function Briefing({ dayNumber, level, numeral, total, name, brief }: Props) {
  const { backstory, orders } = briefingFor(level);
  const pointer = usePointer();
  const header = [
    OPERATION,
    `Assignment ${numeral} of ${total} · ${name}`,
    `Day ${dayNumber}`,
    `From: ${SENDER}`,
    `To: ${RECIPIENT}`,
  ];

  return (
    <article
      aria-label={`${OPERATION}, assignment ${numeral}`}
      className="min-h-0 flex-1 origin-top overflow-y-auto overscroll-contain border-[1.5px] border-ink bg-paper motion-safe:animate-unfold"
    >
      <div className="relative overflow-hidden px-(--space-4) py-(--space-4) text-[14px] leading-[1.55] sm:px-(--space-5)">
        {/* The creases of a letter folded in three. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-ink/10" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-ink/10" />

        <span className="absolute top-(--space-4) right-(--space-4) rotate-6 border-2 border-party bg-paper px-2 pt-1 pb-0.5 font-stencil text-[20px] leading-none font-black text-party uppercase">
          {FOLDER.stamp}
        </span>

        <header className="grid gap-0.5 pr-[96px] text-[13px] tracking-[0.06em] uppercase">
          {header.map((line, index) => (
            <p key={line} className={index === 0 ? "font-bold" : ""}>
              {line}
            </p>
          ))}
        </header>

        <hr className="my-(--space-4) border-t border-dashed border-ink" />

        <div className="grid gap-(--space-3)">
          {[SALUTATION, ...backstory].map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className="mt-(--space-2) font-bold tracking-[0.12em] uppercase">Orders</p>
          {[brief, ...orders].map((order, index) => {
            const text = `${index + 1}. ${forPointer(order, pointer)}`;
            return (
              <p key={text} className="pl-[2ch] -indent-[2ch]">
                {text}
              </p>
            );
          })}
          <p className="text-right">— {SIGN_OFF}</p>
        </div>

        <hr className="my-(--space-4) border-t border-dashed border-ink" />

        <p className="text-[12px] text-muted">{DESTROY_NOTE}</p>

        {/* Someone set their cup down on these orders: in the top corner, clear of the story. */}
        <CoffeeStain className="absolute -top-[72px] -right-[22%] w-[62%] max-w-[290px] rotate-12" />
      </div>
    </article>
  );
}
