import type { AnimationEvent } from "react";
import { OPERATION, SENDER } from "../game/briefings.ts";
import { FOLDER } from "../game/copy.ts";
import { CameraIcon } from "./CameraIcon.tsx";

type Props = {
  dayNumber: number;
  numeral: string;
  total: string;
  name: string;
  /** True while the folder is being opened; it stays open as long as this is true. */
  opening: boolean;
  /** Called once the orders have lifted out. */
  onOpened: () => void;
};

// Manila shades, mixed from --dossier with a little --ink so no new colour is needed.
const COVER = "bg-[color-mix(in_oklab,var(--dossier),var(--ink)_7%)]";
const BACK = "bg-[color-mix(in_oklab,var(--dossier),var(--ink)_14%)]";

/**
 * The manila file folder each record arrives in: a back cover with a file tab, the white orders
 * peeking out over the top, and the front cover with a TOP SECRET stamp and a pasted label, tied
 * shut with a red ribbon under the Ministry's wax seal. Opening it breaks the seal, swings the
 * cover open towards the player and lifts the orders out (design rule 9); they then unfold in full.
 *
 * Flat fills and ink lines on a size container, so it scales with the page; measurements are a
 * share of its width (`cqi`).
 */
export function Folder({ dayNumber, numeral, total, name, opening, onOpened }: Props) {
  const animate = (className: string) => (opening ? className : "");
  const ordersOut = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onOpened();
  };

  return (
    // overflow-x-clip: the cover swings towards the player and must not widen the page as it does.
    <div className="w-full overflow-x-clip">
      <div className="grid justify-items-center gap-1 pt-(--space-5) pb-[12%] text-center">
        <p className="font-stencil text-[26px] leading-none font-black uppercase">{FOLDER.heading}</p>
        <p className="text-[13px] tracking-[0.12em] text-muted uppercase">{FOLDER.instruction}</p>
      </div>
      <figure
        aria-label={`Sealed folder. Record ${numeral} of ${total}, ${name}.`}
        className="@container relative aspect-[3/2] w-full text-ink [perspective:1400px]"
      >
        {/* The back cover's file tab, labelled with the operation. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          className="absolute -top-[10%] left-[5%] h-[10.5%] w-[36%] overflow-visible"
        >
          <polygon
            points="0,20 7,0 93,0 100,20"
            className="fill-[color-mix(in_oklab,var(--dossier),var(--ink)_14%)] stroke-ink"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <p className="absolute -top-[8%] left-[9%] text-[length:max(11px,2.8cqi)] leading-none font-bold tracking-[0.1em] uppercase">
          {FOLDER.tab}
        </p>

        {/* The back cover. */}
        <div className={`absolute inset-0 border-[1.5px] border-ink ${BACK}`} />

        {/* The orders inside, peeking out over the top edge. */}
        <div
          onAnimationEnd={ordersOut}
          className={`absolute -top-[2%] right-[4%] bottom-[5%] left-[3%] grid content-start gap-[1.4cqi] border border-ink bg-paper px-[5cqi] py-[4cqi] text-[length:max(12px,3.4cqi)] leading-[1.35] ${animate("motion-safe:animate-paper-lift")}`}
        >
          <p className="font-bold tracking-[0.06em] uppercase">{OPERATION}</p>
          <p className="tracking-[0.06em] uppercase">
            Assignment {numeral} of {total} · {name}
          </p>
          <p className="tracking-[0.06em] uppercase">From: {SENDER}</p>
          <div aria-hidden="true" className="mt-[2cqi] grid gap-[2.2cqi]">
            {["w-[92%]", "w-[84%]", "w-[96%]", "w-[70%]", "w-[88%]"].map((width) => (
              <span key={width} className={`block h-[0.9cqi] bg-ink/25 ${width}`} />
            ))}
          </div>
        </div>

        {/* The front cover, hinged on the left. */}
        <div
          className={`absolute inset-0 origin-left border-[1.5px] border-ink ${COVER} ${animate("motion-safe:animate-cover-open")}`}
        >
          <p className="absolute top-[7%] left-[6%] text-[length:max(11px,2.8cqi)] tracking-[0.12em] text-muted uppercase">
            Records Department
          </p>
          <span
            className={`absolute top-[18%] left-[6%] -rotate-6 border-[0.6cqi] border-party px-[2cqi] pt-[0.8cqi] pb-[0.4cqi] font-stencil text-[length:7.5cqi] leading-none font-black whitespace-nowrap text-party uppercase ${COVER}`}
          >
            {FOLDER.stamp}
          </span>
          <p className="absolute bottom-[9%] left-[6%] border-[1.5px] border-ink bg-paper px-[2.4cqi] py-[1.6cqi] text-[length:max(13px,3.6cqi)] leading-[1.4] whitespace-nowrap">
            <span className="block font-bold tracking-[0.04em] uppercase">{FOLDER.sender}</span>
            <span className="block font-bold">
              Record {numeral} of {total}
            </span>
            <span className="block">
              Day {dayNumber} · {FOLDER.eyesOnly}
            </span>
          </p>
        </div>

        {/* The ribbon tied around the folder, and the wax seal that closes it. */}
        <div className={`absolute top-0 right-[13%] bottom-0 w-[2.4cqi] bg-party ${animate("motion-safe:animate-seal-break")}`} />
        <div
          className={`absolute top-1/2 right-[14.2%] grid size-[17cqi] translate-x-1/2 -translate-y-1/2 place-items-center ${animate("motion-safe:animate-seal-break")}`}
        >
          <WaxSeal />
          <CameraIcon className="relative size-[8cqi] text-paper" />
        </div>
      </figure>
    </div>
  );
}

/**
 * The wax: a flat Party-red blob with an uneven, poured edge and a ring pressed into it. One of
 * the curves the design allows (design rule 4); flat fills only, no gradients.
 */
function WaxSeal() {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 size-full">
      <path
        className="fill-party"
        d="M59.7 6.5Q69.3 9.9 77.8 15.5Q86.4 21.0 89.4 30.7Q92.4 40.3 94.4 50.4Q96.3 60.6 90.7 69.3Q85.2 78.1 77.1 83.8Q69.1 89.6 59.5 93.3Q50.0 97.0 40.5 93.2Q31.0 89.5 22.4 84.1Q13.9 78.8 9.9 69.4Q5.9 60.1 4.8 49.7Q3.6 39.4 9.5 30.9Q15.4 22.4 22.7 15.3Q29.9 8.2 39.9 5.6Q50.0 3.0 59.7 6.5Z"
      />
      <circle cx="50" cy="50" r="33" fill="none" className="stroke-paper" strokeWidth={2.5} />
    </svg>
  );
}
