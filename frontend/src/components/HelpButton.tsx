import type { Ref } from "react";

type Props = {
  onOpen: () => void;
  /** So focus can return here when the rules close. */
  ref?: Ref<HTMLButtonElement>;
};

/**
 * The quiet "?" that opens the rules card during a record. A small form box, 22px to the eye but a
 * full 44px to the finger (the negative margin keeps the larger hit area from moving anything).
 */
export function HelpButton({ onOpen, ref }: Props) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Rules"
      aria-haspopup="dialog"
      onClick={onOpen}
      className="group -m-[11px] grid size-11 shrink-0 cursor-pointer place-items-center focus-visible:outline-3 focus-visible:-outline-offset-8 focus-visible:outline-party focus-visible:outline-solid"
    >
      <span className="grid size-[22px] place-items-center border border-muted text-[13px] leading-none font-bold text-muted group-hover:border-ink group-hover:text-ink">
        ?
      </span>
    </button>
  );
}
