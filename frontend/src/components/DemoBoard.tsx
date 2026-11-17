import { useMemo } from "react";
import { parseDemoRows, type BoardFrame } from "../game/tutorial.ts";
import { BoardCell } from "./BoardCell.tsx";
import { BoardGrid } from "./BoardGrid.tsx";
import { CameraIcon } from "./CameraIcon.tsx";
import { DemoStamp } from "./DemoStamp.tsx";

const MAX_STRIKES = 3;

/**
 * One frame of a How to play demo, drawn with the real board cells so it looks exactly like play.
 * It is an illustration: inert and hidden from assistive tech, because the page text says the rule.
 */
export function DemoBoard({ frame, lies }: { frame: BoardFrame; lies: boolean }) {
  const { cols, cells } = useMemo(() => parseDemoRows(frame.rows), [frame.rows]);
  const gaze = useMemo(() => gazeDistances(frame, cols), [frame, cols]);

  return (
    <div className="grid gap-(--space-2)">
      <div className="relative">
        <BoardGrid cols={cols} inert aria-hidden="true">
          {cells.map((cell, index) => (
            <BoardCell
              key={index}
              cell={cell}
              index={index}
              lies={lies}
              position=""
              gazeDistance={gaze.get(index)}
              selected={index === frame.selected}
              hinted={index === frame.hinted}
            />
          ))}
        </BoardGrid>
        {frame.verdict !== undefined && <DemoStamp key={frame.verdict} verdict={frame.verdict} />}
      </div>
      {frame.strikes !== undefined && (
        <p className="flex items-center justify-center gap-(--space-2) text-[13px]" aria-hidden="true">
          Strikes
          {Array.from({ length: MAX_STRIKES }, (_, k) => (
            <CameraIcon
              key={k}
              className={`size-5 ${k < (frame.strikes ?? 0) ? "text-party" : "text-muted opacity-45"}`}
            />
          ))}
        </p>
      )}
    </div>
  );
}

/** Taxicab distance from the selected cell to each lit cell, which staggers the sight-line sweep. */
function gazeDistances(frame: BoardFrame, cols: number): Map<number, number> {
  const from = frame.selected;
  if (from === undefined || frame.gaze === undefined) return new Map();
  const row = Math.floor(from / cols);
  const col = from % cols;
  return new Map(
    frame.gaze.map((cell) => [
      cell,
      Math.abs(Math.floor(cell / cols) - row) + Math.abs((cell % cols) - col),
    ]),
  );
}
