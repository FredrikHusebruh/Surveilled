import { STEP_TAGS, type StepTag } from "../game/training.ts";

/** A rule is a filled ink chip; tips are outlined, pro tips with a double rule. Never red: red is the Party's. */
const TAG_STYLES: Record<StepTag, string> = {
  rule: "border-[1.5px] border-ink bg-ink text-paper",
  tip: "border-[1.5px] border-ink",
  proTip: "border-3 border-double border-ink",
};

type Props = {
  /** What the card teaches. A card without a tag (the filed record) is just a note. */
  tag?: StepTag;
  title: string;
  text: string;
};

/**
 * The card above a training board: whether it is a rule or a tip, a stencil title and one or two
 * sentences. It changes as the player makes each guided move, and is announced when it does.
 */
export function TrainingCard({ tag, title, text }: Props) {
  return (
    <section aria-live="polite" className="grid gap-(--space-2) border-[1.5px] border-ink bg-paper p-(--space-3)">
      <h2 className="grid justify-items-start gap-(--space-2)">
        {tag !== undefined && (
          <span className={`px-1.5 py-0.5 text-[11px] leading-none font-bold tracking-[0.12em] uppercase ${TAG_STYLES[tag]}`}>
            {STEP_TAGS[tag]}
            <span className="sr-only">:</span>
          </span>
        )}
        <span className="font-stencil text-[24px] leading-none font-black uppercase">{title}</span>
      </h2>
      <p className="text-[14px] leading-[1.5]">{text}</p>
    </section>
  );
}
