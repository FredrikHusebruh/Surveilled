import { FOLDER, TRAINING, formatRecordDate, formatRecordNo } from "../game/copy.ts";

type Props = {
  dayNumber: number | null;
  /** The date of the records being played ("2026-11-21"), or null while the day is loading. */
  day: string | null;
  /** The open record's number, null while it is still sealed, or "training" in a training record. */
  recordNo: number | "training" | null;
  toppled: boolean;
};

/**
 * Department eyebrow with the day number, the stencil name, and the form line: the records' date
 * and the record number. Once the player topples the government, the Ministry's name is struck
 * through and the department dissolved.
 */
export function Masthead({ dayNumber, day, recordNo, toppled }: Props) {
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
        {/* A non-breaking space holds the line's height while the day loads. */}
        <span>{day === null ? " " : formatRecordDate(day)}</span>
        <span>
          Record no.{" "}
          <b className="tabular-nums">{recordLabel(recordNo)}</b>
        </span>
      </p>
    </header>
  );
}

function recordLabel(recordNo: number | "training" | null): string {
  if (recordNo === null) return FOLDER.sealed;
  return recordNo === "training" ? TRAINING.recordNo : formatRecordNo(recordNo);
}
