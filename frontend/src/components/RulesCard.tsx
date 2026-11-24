import type { Ref } from "react";
import { TRAINING, forPointer, romanNumeral } from "../game/copy.ts";
import { TRAININGS } from "../game/training.ts";
import { usePointer } from "../hooks/usePointer.ts";

type Props = {
  /** The record being played: its rules and every earlier record's are listed. */
  level: number;
  /** Focused when the rules come up, so a screen reader reads them (`useSideSheet`). */
  headingRef: Ref<HTMLHeadingElement>;
};

/**
 * The rules card the "?" feeds into the typewriter in the record's place: the rules learned so
 * far, one line each, grouped by the record that brought them. Nothing to click through ("Back
 * to record" is on the machine); practice lives in the training records, opened from the orders.
 */
export function RulesCard({ level, headingRef }: Props) {
  const learned = TRAININGS.filter((training) => training.level <= level);
  const pointer = usePointer();
  return (
    <div className="grid gap-(--space-4) px-(--space-4) py-(--space-4) sm:px-(--space-5)">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="border-b-3 border-ink pb-(--space-3) font-stencil text-[30px] leading-none font-black uppercase focus:outline-none"
      >
        {TRAINING.rulesTitle}
      </h2>
      {learned.map((training) => (
        <section key={training.level} aria-labelledby={`rules-${training.level}`} className="grid gap-(--space-2)">
          <h3 id={`rules-${training.level}`} className="text-[13px] font-bold tracking-[0.12em] uppercase">
            Record {romanNumeral(training.level - 1)} · {training.name}
          </h3>
          <ul className="grid gap-(--space-1)">
            {training.rules.map((rule) => forPointer(rule, pointer)).map((rule) => (
              <li key={rule} className="grid grid-cols-[12px_1fr] gap-(--space-2) text-[14px] leading-[1.5]">
                <span aria-hidden="true" className="mt-[7px] size-2 bg-ink" />
                {rule}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="border-t border-dashed border-ink pt-(--space-3) text-[13px] text-muted">{TRAINING.rulesNote}</p>
    </div>
  );
}
