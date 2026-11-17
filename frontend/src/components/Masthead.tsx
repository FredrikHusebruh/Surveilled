import { FOLDER, formatRecordNo } from "../game/copy.ts";

type Props = {
  dayNumber: number | null;
  /** The open record's number, or null while it is still sealed. */
  recordNo: number | null;
  toppled: boolean;
};

/**
 * Department eyebrow with the day number, the stencil name, and the form line. Once the player
 * topples the government, the Ministry's name is struck through and the department dissolved.
 */
export function Masthead({ dayNumber, recordNo, toppled }: Props) {
  return (
    <header className="grid gap-0.5 border-b-3 border-ink pb-(--space-3)">
      <p className="text-[12px] tracking-[0.12em] text-muted uppercase">
        <span className={toppled ? "line-through decoration-2" : ""}>Ministry of Truth</span>
        {toppled ? " · Dissolved" : " · Records Department"}
        {dayNumber !== null && ` · Day ${dayNumber}`}
      </p>
      <h1 className="font-stencil text-[clamp(44px,13.5vw,80px)] leading-[0.86] font-black tracking-[0.01em] text-balance uppercase">
        Surveilled
      </h1>
      <p className="mt-(--space-1) flex flex-wrap justify-between gap-2 text-[13px]">
        <span>Form 1984-B</span>
        <span>
          Record no.{" "}
          <b className="tabular-nums">{recordNo === null ? FOLDER.sealed : formatRecordNo(recordNo)}</b>
        </span>
      </p>
    </header>
  );
}
