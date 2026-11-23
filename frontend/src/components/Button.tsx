import type { ComponentPropsWithRef } from "react";

type Props = ComponentPropsWithRef<"button"> & {
  /** The view's single primary action: Party red. Use at most one per view (design.md). */
  primary?: boolean;
  /** A toggle that is on (with `aria-pressed`): ink with paper text. */
  pressed?: boolean;
};

/** The form button: square, paper, 1.5px ink border, bold typewriter. */
export function Button({ primary = false, pressed = false, className = "", type = "button", ...props }: Props) {
  const tone = primary
    ? "border-party bg-party text-paper"
    : pressed
      ? "border-ink bg-ink text-paper"
      : "border-ink bg-paper text-ink";
  return (
    <button
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center gap-(--space-2) border-[1.5px] px-3 py-2.5 text-[14px] font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-party focus-visible:outline-solid disabled:cursor-default disabled:opacity-50 ${tone} ${className}`}
      {...props}
    />
  );
}
