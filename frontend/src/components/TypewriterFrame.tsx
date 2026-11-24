import { useEffect, useRef } from "react";
import type { ComponentProps, ReactNode } from "react";
import { feedPaper } from "../lib/sound.ts";
import { Machine } from "./Machine.tsx";

const FEED = "motion-safe:animate-feed";

type Props = ComponentProps<typeof Machine> & {
  /**
   * Names the sheet in the machine ("record:2026-11-24:3", "report:…"). A new name feeds a fresh
   * sheet in: the paper rises from behind the platen with the ratchet of the platen knob, and
   * starts at its top.
   */
  sheet: string;
  /** What is typed on the sheet. */
  paper: ReactNode;
};

/**
 * Every screen after the folder: a sheet of paper rolled into a typewriter, exactly one screen
 * tall. The paper fills what the machine leaves; anything taller than that (the orders, the
 * report, a record on a very short screen) scrolls inside the paper, like feeding it through, so
 * the page itself never scrolls. The paper is not remounted when the sheet changes, so a record
 * kept underneath (hidden while its report is read) keeps its state.
 */
export function TypewriterFrame({ sheet, paper, ...machine }: Props) {
  const paperRef = useRef<HTMLDivElement>(null);
  const fed = useRef<string | null>(null);

  useEffect(() => {
    const element = paperRef.current;
    if (element === null || fed.current === sheet) return;
    const first = fed.current === null;
    fed.current = sheet;
    feedPaper();
    // The first sheet feeds in as the frame mounts; later ones restart the feed animation (drop
    // the class, let the browser notice, put it back) and start at the top of the new sheet.
    if (first) return;
    element.scrollTop = 0;
    element.classList.remove(FEED);
    void element.offsetWidth;
    element.classList.add(FEED);
  }, [sheet]);

  return (
    <div className="grid h-dvh grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
      <div className="flex min-h-0 justify-center px-(--space-2) pt-(--space-2) sm:px-(--space-5) sm:pt-(--space-4)">
        <div
          ref={paperRef}
          className={`w-full max-w-(--sheet-max) overflow-y-auto overscroll-contain border-x-[1.5px] border-t-[1.5px] border-ink bg-paper ${FEED}`}
        >
          {paper}
        </div>
      </div>
      <Machine {...machine} />
    </div>
  );
}
