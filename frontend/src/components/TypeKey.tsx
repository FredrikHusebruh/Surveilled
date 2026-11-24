import type { ComponentPropsWithRef, ReactNode } from "react";

type Props = Omit<ComponentPropsWithRef<"button">, "children"> & {
  /** The symbol on the key's face. */
  symbol: ReactNode;
  /** The small word under the symbol; hidden from screen readers, which get the `aria-label`. */
  label: string;
  /** Held down: a key the player has pressed and not yet let go (Open while choosing a cell). */
  down?: boolean;
};

/**
 * A round typewriter key on the machine: black enamel cap, slate rim, a paper symbol with a small
 * word under it. Held down, it sits lower with a paper cap; used up, its legend fades and it no
 * longer moves. One of the curves the design allows (design rule 4).
 */
export function TypeKey({ symbol, label, down = false, className = "", type = "button", ...props }: Props) {
  const cap = down ? "translate-y-[2px] bg-paper text-ink" : "bg-ink text-paper enabled:active:translate-y-[2px]";
  return (
    <button
      type={type}
      className={`grid size-16 shrink-0 cursor-pointer content-center justify-items-center gap-1 rounded-full border-[3px] border-slate leading-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-party focus-visible:outline-solid disabled:cursor-default disabled:text-paper/40 ${cap} ${className}`}
      {...props}
    >
      {symbol}
      <span aria-hidden="true" className="text-[11px] font-bold">
        {label}
      </span>
    </button>
  );
}
