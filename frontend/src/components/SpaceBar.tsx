import type { ComponentPropsWithRef } from "react";

type Props = ComponentPropsWithRef<"button"> & {
  /** The view's single primary action: Party red (at most one per view, design rule 2). */
  primary?: boolean;
};

/**
 * A wide, square bar on the typewriter's keyboard, like its space bar: the screen's main actions
 * (Start operation, Show report, Next training). Plain ones are black enamel like the keys.
 */
export function SpaceBar({ primary = false, className = "", type = "button", ...props }: Props) {
  const tone = primary ? "border-party bg-party text-paper" : "border-slate bg-ink text-paper";
  return (
    <button
      type={type}
      className={`h-12 min-w-0 flex-1 cursor-pointer border-[3px] px-2 text-[14px] leading-tight font-bold enabled:active:translate-y-[2px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-party focus-visible:outline-solid disabled:cursor-default disabled:opacity-50 ${tone} ${className}`}
      {...props}
    />
  );
}
