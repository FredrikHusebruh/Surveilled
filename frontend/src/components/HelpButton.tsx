type Props = {
  /** The rules are in the machine in the record's place. */
  open: boolean;
  onToggle: () => void;
};

/**
 * The "?" that feeds the rules into the typewriter during a record, and takes them out again: a
 * small square function tab on the machine, right of the keys, matching the sound switch on the
 * left. Held down (a paper face) while the rules are in.
 */
export function HelpButton({ open, onToggle }: Props) {
  return (
    <button
      type="button"
      aria-label="Rules"
      aria-pressed={open}
      onClick={onToggle}
      className={`grid size-12 shrink-0 cursor-pointer place-items-center border-2 border-slate text-[18px] leading-none font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-party focus-visible:outline-solid ${open ? "bg-paper text-ink" : "bg-ink text-paper/80 hover:text-paper"}`}
    >
      ?
    </button>
  );
}
