import type { RefObject } from "react";
import { TRAINING, forPointer, romanNumeral } from "../game/copy.ts";
import { usePointer } from "../hooks/usePointer.ts";
import { TRAININGS } from "../game/training.ts";
import { Sheet } from "./Sheet.tsx";

type Props = {
  /** The record being played: its rules and every earlier record's are listed. */
  level: number;
  returnFocusTo: RefObject<HTMLElement | null>;
  onClose: () => void;
};

/**
 * The rules card the "?" opens during a record: the rules learned so far, one line each, grouped
 * by the record that brought them. Nothing to click through; practice lives in the training
 * records, opened from the orders.
 */
export function RulesCard({ level, returnFocusTo, onClose }: Props) {
  const learned = TRAININGS.filter((training) => training.level <= level);
  const pointer = usePointer();
  return (
    <Sheet labelledBy="rules-title" returnFocusTo={returnFocusTo} onClose={onClose}>
      <div className="grid gap-(--space-4) p-(--space-5)">
        <h2
          id="rules-title"
          className="border-b-3 border-ink pr-[56px] pb-(--space-3) font-stencil text-[30px] leading-none font-black uppercase"
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
    </Sheet>
  );
}
