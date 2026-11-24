import type { ReactNode } from "react";
import { FOLDER, TRAINING, formatRecordDate, formatRecordNo } from "../game/copy.ts";

type Props = {
  dayNumber: number | null;
  /** The date of the records being played ("2026-11-21"), or null while the day is loading. */
  day: string | null;
  /** The open record's number, null while it is still sealed, or "training" in a training record. */
  recordNo: number | "training" | null;
  toppled: boolean;
  /** Takes the place of the record number at the right end (Leave training). */
  aside?: ReactNode;
  /** Takes the place of the game's name and day at the left end (the training record's name). */
  title?: ReactNode;
};

/**
 * The first typed line of every sheet: the game's name and the day on the left, the record number
 * on the right, and the date between them where there is room. A training record puts its own
 * name on the left and Leave training on the right. Once the government is toppled,
 * the Ministry's name stands struck through in place of the date.
 */
export function Letterhead({ dayNumber, day, recordNo, toppled, aside, title }: Props) {
  return (
    <header className="flex min-h-5 flex-wrap items-center justify-between gap-x-(--space-3) gap-y-(--space-1) text-[12px] leading-tight tracking-[0.08em] uppercase">
      <h1>
        {title ?? (
          <>
            <span className="font-bold">Surveilled</span>
            {dayNumber !== null && ` · Day ${dayNumber}`}
          </>
        )}
      </h1>
      {toppled ? (
        <p>
          <span className="line-through decoration-2">Ministry of Truth</span>
          <span className="sr-only"> dissolved</span>
        </p>
      ) : (
        day !== null && <p className="text-muted max-[420px]:hidden">{formatRecordDate(day)}</p>
      )}
      {aside ?? (
        <p>
          No. <b className="tabular-nums">{recordLabel(recordNo)}</b>
        </p>
      )}
    </header>
  );
}

function recordLabel(recordNo: number | "training" | null): string {
  if (recordNo === null) return FOLDER.sealed;
  return recordNo === "training" ? TRAINING.recordNo : formatRecordNo(recordNo);
}
