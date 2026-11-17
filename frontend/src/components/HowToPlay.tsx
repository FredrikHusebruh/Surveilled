import { useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { TUTORIAL, type TutorialPage } from "../game/tutorial.ts";
import { useDemoPlayer } from "../hooks/useDemoPlayer.ts";
import { Button } from "./Button.tsx";
import { DemoBoard } from "./DemoBoard.tsx";
import { DemoLevels } from "./DemoLevels.tsx";
import { Sheet } from "./Sheet.tsx";

type Props = {
  /** The day's level names, for the progression demo. */
  levelNames: string[];
  /** Where focus goes back to once the overlay is gone: the button that opened it. */
  returnFocusTo: RefObject<HTMLElement | null>;
  onClose: () => void;
};

/**
 * How to play, on a sheet above the page: one rule per page, each with an animated demo and the
 * rule in words. Mount it to open it. It closes like any sheet, or with Start on the last page;
 * arrow keys turn pages.
 */
export function HowToPlay({ levelNames, returnFocusTo, onClose }: Props) {
  const [page, setPage] = useState(0);
  const last = TUTORIAL.length - 1;
  const current = TUTORIAL[page];

  const turn = (to: number) => setPage(Math.max(0, Math.min(last, to)));

  const turnWithArrows = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowRight") turn(page + 1);
    else if (event.key === "ArrowLeft") turn(page - 1);
  };

  return (
    <Sheet labelledBy="how-to-play-title" returnFocusTo={returnFocusTo} onClose={onClose} onKeyDown={turnWithArrows}>
      <div className="grid gap-(--space-4) p-(--space-5)">
        <header className="flex items-start justify-between gap-(--space-3) border-b-3 border-ink pr-[56px] pb-(--space-3)">
          <div className="grid gap-0.5">
            <p className="text-[12px] tracking-[0.12em] text-muted uppercase">
              Standing orders · Page {page + 1} of {TUTORIAL.length}
            </p>
            <h2 id="how-to-play-title" className="font-stencil text-[30px] leading-none font-black uppercase">
              How to play
            </h2>
          </div>
        </header>

        <section aria-labelledby="how-to-play-page" className="grid gap-(--space-3)">
          <h3 id="how-to-play-page" aria-live="polite" className="font-stencil text-[24px] leading-none font-black uppercase">
            {current.title}
          </h3>
          <Demo key={page} page={current} levelNames={levelNames} />
          <div className="grid gap-(--space-2) text-[14px] leading-[1.5]">
            {current.text.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <nav aria-label="Pages" className="grid gap-(--space-2) border-t border-ink pt-(--space-2)">
          <div className="flex justify-center">
            {TUTORIAL.map((tutorialPage, index) => (
              <button
                key={tutorialPage.title}
                type="button"
                aria-label={`Page ${index + 1}: ${tutorialPage.title}`}
                aria-current={index === page ? "step" : undefined}
                onClick={() => turn(index)}
                className="grid size-7 cursor-pointer place-items-center focus-visible:outline-3 focus-visible:outline-party focus-visible:outline-solid"
              >
                <span className={`size-3 border-[1.5px] border-ink ${index === page ? "bg-ink" : "bg-paper"}`} />
              </button>
            ))}
          </div>
          <div className="flex justify-between gap-(--space-2)">
            <Button onClick={() => turn(page - 1)} disabled={page === 0}>
              Previous
            </Button>
            {page === last ? (
              <Button primary onClick={onClose}>
                Start
              </Button>
            ) : (
              <Button primary onClick={() => turn(page + 1)}>
                Next
              </Button>
            )}
          </div>
        </nav>
      </div>
    </Sheet>
  );
}

/** A page's demo with its caption and a pause control. Keyed by page, so it restarts on each. */
function Demo({ page, levelNames }: { page: TutorialPage; levelNames: string[] }) {
  const { demo } = page;
  const { frame, playing, togglePlaying } = useDemoPlayer(demo.frames.length);
  const caption = demo.frames[frame].caption;

  return (
    <figure className="grid gap-(--space-2) border-[1.5px] border-ink bg-concrete p-(--space-3)">
      {demo.kind === "board" ? (
        <DemoBoard frame={demo.frames[frame]} lies={demo.lies} />
      ) : (
        <DemoLevels frame={demo.frames[frame]} levelNames={levelNames} />
      )}
      <figcaption className="flex items-center justify-between gap-(--space-3)">
        <span className="min-h-[3em] text-[13px] leading-[1.5]">
          <span className="font-bold">
            {frame + 1}/{demo.frames.length}
          </span>{" "}
          {caption}
        </span>
        <button
          type="button"
          onClick={togglePlaying}
          className="shrink-0 cursor-pointer border-[1.5px] border-ink bg-paper px-2 py-1 text-[12px] font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-party focus-visible:outline-solid"
        >
          {playing ? "Pause" : "Play"}
        </button>
      </figcaption>
    </figure>
  );
}
