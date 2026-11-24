import type { ReactNode } from "react";
import { PRIVACY_PATH } from "../game/privacy.ts";
import { useMachineHeight } from "../hooks/useMachineHeight.ts";

type Props = {
  /** The function tab left of the keys (the sound switch). */
  left?: ReactNode;
  /** The function tab right of the keys (the "?"), or nothing. */
  right?: ReactNode;
  /** A notice on the machine's body above the keys, in the normal flow (the cookie notice). */
  notice?: ReactNode;
  /** The keyboard: the hint keys, or the space bars for the screen's actions. */
  children?: ReactNode;
};

/**
 * The typewriter under the paper, as seen from the typist's seat: the platen the paper rolls over,
 * the paper bail across its foot, and the black enamel body: the fan of typebars resting in their
 * segment under the platen, one row of keys in front of it between two function tabs, and the privacy link on a small plate (hidden while the cookie notice, which links
 * to it too, is up). Flat fills only (design rules 1 and 6).
 * The side tabs share one width so the keys stay centred.
 */
export function Machine({ left, right, notice, children }: Props) {
  const ref = useMachineHeight<HTMLDivElement>();
  return (
    <div ref={ref} className="relative z-10 mx-auto w-full max-w-[calc(var(--sheet-max)+64px)]">
      <Platen />
      <div className="grid gap-(--space-3) border-t-2 border-slate bg-ink px-(--space-3) pt-(--space-2) pb-[max(var(--space-2),env(safe-area-inset-bottom))] text-paper">
        {notice}
        <div className="relative pt-[18px]">
          <Typebars />
          <div className="relative flex items-center gap-(--space-2)">
            <div className="flex w-12 shrink-0 justify-start">{left}</div>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-(--space-3)">{children}</div>
            <div className="flex w-12 shrink-0 justify-end">{right}</div>
          </div>
        </div>
        {/* The cookie notice carries its own link to the privacy notice. */}
        <p className={`-mt-(--space-1) text-center text-[11px] leading-none ${notice ? "hidden" : ""}`}>
          <a
            href={PRIVACY_PATH}
            className="text-paper/80 underline decoration-1 underline-offset-2 hover:text-paper hover:decoration-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-party focus-visible:outline-solid"
          >
            Privacy notice
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * The platen: the roller the paper is fed round, with a knob at each end, and the paper bail
 * holding the sheet down across its foot. Decoration only. The knobs and the bail's rollers are
 * among the curves the design allows (design rule 4).
 */
function Platen() {
  return (
    <div aria-hidden="true" className="relative h-[22px]">
      <div className="absolute -top-[9px] left-[22%] right-[22%] h-[5px] border border-ink bg-slate">
        <span className="absolute -top-[3px] left-[18%] h-[9px] w-[22px] rounded-full border border-ink bg-slate" />
        <span className="absolute -top-[3px] right-[18%] h-[9px] w-[22px] rounded-full border border-ink bg-slate" />
      </div>
      <div className="absolute inset-y-0 left-[14px] right-[14px] border-y-2 border-slate bg-ink">
        <span className="absolute inset-x-0 top-[4px] h-px bg-slate" />
      </div>
      <span className="absolute top-1/2 left-0 size-[28px] -translate-y-1/2 rounded-full border-[3px] border-slate bg-ink" />
      <span className="absolute top-1/2 right-0 size-[28px] -translate-y-1/2 rounded-full border-[3px] border-slate bg-ink" />
    </div>
  );
}

/** The typing point, above the drawing: every typebar swings up to strike the platen there. */
const STRIKE = { x: 180, y: -30 };
/** The segment the typebars rest in, and how far out they reach (ellipses around the strike). */
const SEGMENT = { rx: 62, ry: 40 };
const REACH = { rx: 176, ry: 86 };
const TYPEBAR_COUNT = 36;
const FIRST_DEG = 8;
const LAST_DEG = 172;

const onEllipse = (ellipse: { rx: number; ry: number }, radians: number) => ({
  x: Math.round((STRIKE.x + ellipse.rx * Math.cos(radians)) * 10) / 10,
  y: Math.round((STRIKE.y + ellipse.ry * Math.sin(radians)) * 10) / 10,
});

const TYPEBARS = Array.from({ length: TYPEBAR_COUNT }, (_, k) => {
  const radians = ((FIRST_DEG + (k * (LAST_DEG - FIRST_DEG)) / (TYPEBAR_COUNT - 1)) * Math.PI) / 180;
  return { from: onEllipse(SEGMENT, radians), to: onEllipse(REACH, radians) };
});
const SEGMENT_START = onEllipse(SEGMENT, (FIRST_DEG * Math.PI) / 180);
const SEGMENT_END = onEllipse(SEGMENT, (LAST_DEG * Math.PI) / 180);

/**
 * The typebars: a fan of thin bars resting in their curved segment under the platen, all pointing
 * up at the typing point, the part that makes it read as a typewriter. The keys sit in front of
 * their outer ends. Drawn decoration, flat, in paper faded into the black enamel like worn steel; the segment's curve is one of the curves the
 * design allows (design rule 4).
 */
function Typebars() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 360 60"
      className="absolute top-0 left-1/2 h-[60px] w-[360px] max-w-full -translate-x-1/2"
    >
      {TYPEBARS.map(({ from, to }) => (
        <line key={`${to.x},${to.y}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="stroke-paper/30" strokeWidth={2.2} />
      ))}
      <path
        d={`M ${SEGMENT_START.x} ${SEGMENT_START.y} A ${SEGMENT.rx} ${SEGMENT.ry} 0 0 1 ${SEGMENT_END.x} ${SEGMENT_END.y}`}
        fill="none"
        className="stroke-paper/40"
        strokeWidth={6}
      />
    </svg>
  );
}
