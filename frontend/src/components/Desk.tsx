import type { ReactNode } from "react";
import { Letterhead } from "./Letterhead.tsx";
import { PageFooter } from "./PageFooter.tsx";

type Props = {
  dayNumber: number;
  day: string;
  toppled: boolean;
  /** At the foot, above the privacy link: the cookie notice until it is acknowledged. */
  notice?: ReactNode;
  /**
   * Exactly one screen tall, for content that scrolls inside itself (the orders). Otherwise the
   * desk is at least one screen tall and its content is sized to fit (the folder).
   */
  fixedHeight?: boolean;
  children: ReactNode;
};

/**
 * The desk, where everything before the typewriter happens: the sealed folder, then the orders
 * taken out of it. One column on the concrete, the letterhead line over a 3px ink rule at the top,
 * the cookie notice and the privacy link at the foot.
 */
export function Desk({ dayNumber, day, toppled, notice, fixedHeight = false, children }: Props) {
  return (
    <div
      className={`mx-auto flex max-w-(--sheet-max) flex-col gap-(--space-4) px-(--space-5) pt-(--space-4) pb-(--space-4) ${fixedHeight ? "h-dvh" : "min-h-dvh"}`}
    >
      <div className="border-b-3 border-ink pb-(--space-2)">
        <Letterhead dayNumber={dayNumber} day={day} recordNo={null} toppled={toppled} />
      </div>
      {children}
      <div className="mt-auto grid gap-(--space-4)">
        {notice}
        <PageFooter />
      </div>
    </div>
  );
}
