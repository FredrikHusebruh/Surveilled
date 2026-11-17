import type { Verdict } from "../game/tutorial.ts";

/** A verdict stamp thunked over a demo, as on the real result panel. */
export function DemoStamp({ verdict }: { verdict: Verdict }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <span className="-rotate-3 border-3 border-party bg-paper/90 px-2 pt-1 pb-0.5 font-stencil text-[34px] leading-[0.9] font-black text-party uppercase motion-safe:animate-thunk">
        {verdict}
      </span>
    </div>
  );
}
