import type { ReactNode } from "react";
import type { Cell } from "../api/schemas.ts";
import { SWEEP_MS_PER_STEP } from "../game/board.ts";
import { cellLabel } from "../game/copy.ts";
import { CameraIcon } from "./CameraIcon.tsx";

type Props = {
  cell: Cell;
  index: number;
  lies: boolean;
  position: string;
  /** Distance from the selected number, when this cell is in its sight lines. */
  gazeDistance: number | undefined;
  selected: boolean;
  hinted: boolean;
  /** How long after the move this cell is typed in (ms), when the last move opened it. */
  revealDelay: number | undefined;
  /** The last move marked this cell as a camera or stamped it False: only then does it animate. */
  justMarked: boolean;
};

/**
 * One board cell. Each state has exactly one look (design.md, "The board"); interaction states
 * are outlines, never fills. Input is handled by the board, which reads `data-cell`.
 */
export function BoardCell({
  cell,
  index,
  lies,
  position,
  gazeDistance,
  selected,
  hinted,
  revealDelay,
  justMarked,
}: Props) {
  const gazed = gazeDistance !== undefined;
  const typed = revealDelay !== undefined;
  const delay = revealDelay ?? (gazeDistance ?? 0) * SWEEP_MS_PER_STEP;
  return (
    <button
      type="button"
      data-cell={index}
      tabIndex={cell.kind === "wall" ? -1 : 0}
      aria-label={cellLabel(cell, lies, position)}
      className={`${BASE} ${surface(cell, lies, gazed)} ${outline(selected, hinted)} ${jolt(cell, typed, justMarked)}`}
      style={typed ? { transitionDelay: `${delay}ms`, animationDelay: `${delay}ms` } : gazed ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {import.meta.env.DEV && cell.kind !== "wall" && <Cubicle onRed={cell.kind === "exposed"} furnished={cell.kind === "hidden"} />}
      {!typed ? (
        <CellContent cell={cell} index={index} lies={lies} justMarked={justMarked} />
      ) : (
        <Keystrike delay={delay}>
          <CellContent cell={cell} index={index} lies={lies} justMarked={false} />
        </Keystrike>
      )}
    </button>
  );
}

/**
 * A cell opening (design rule 9): what was under the paper is typed in, `delay` after the move so
 * a cascade ripples outward. It lands at once, pressed into the paper and heavy with fresh ink,
 * springs back and settles; the cell itself jolts like the platen taking the blow
 * (`animate-platen` on the cell). Until then it holds its first frame, so cells further out stay
 * blank; the cell's own colour change waits the same delay.
 */
function Keystrike({ delay, children }: { delay: number; children: ReactNode }) {
  return (
    <span
      className="relative grid size-full place-items-center motion-safe:animate-keystrike"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </span>
  );
}

/**
 * The blow a cell takes when the last move landed on it: the platen's dip under a keystroke or a
 * camera mark, the heavier thud of a False stamp.
 */
function jolt(cell: Cell, typed: boolean, justMarked: boolean): string {
  if (typed) return "motion-safe:animate-platen";
  if (!justMarked) return "";
  return cell.kind === "given" ? "motion-safe:animate-thud" : "motion-safe:animate-platen";
}

const BASE =
  "relative grid aspect-square place-items-center select-none touch-manipulation [-webkit-touch-callout:none] focus-visible:z-10 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-party focus-visible:outline-solid motion-safe:transition-[color,background-color,outline-color,box-shadow] motion-safe:duration-180";

const RAISED = "cursor-pointer shadow-(--shadow-tile)";
const PARTY_CORNER =
  "before:absolute before:top-0 before:left-0 before:z-1 before:border-t-9 before:border-r-9 before:border-t-party before:border-r-transparent";
const STRUCK =
  "after:absolute after:inset-x-[12%] after:top-1/2 after:-rotate-45 after:border-t-3 after:border-party";

function surface(cell: Cell, lies: boolean, gazed: boolean): string {
  const hiddenGround = gazed ? "bg-gaze" : "bg-paper";
  const numberGround = gazed ? "bg-gaze-number" : "bg-cleared cubicles:bg-concrete";
  switch (cell.kind) {
    case "wall":
      return "cursor-default bg-slate";
    case "hidden":
      return `${hiddenGround} ${RAISED}`;
    case "marked":
      return `${hiddenGround} ${RAISED} text-ink ${cell.wrong ? STRUCK : ""}`;
    case "revealed":
      return `${hiddenGround} ${RAISED} text-party`;
    case "exposed":
      return "cursor-default bg-party text-paper";
    case "given":
      return `cursor-pointer ${numberGround} ${lies ? PARTY_CORNER : ""}`;
    case "observation":
      return `cursor-pointer ${numberGround}`;
  }
}

function outline(selected: boolean, hinted: boolean): string {
  if (hinted) return "z-10 outline-3 -outline-offset-4 outline-party outline-dashed motion-safe:animate-blink";
  if (selected) return "z-10 outline-3 -outline-offset-3 outline-ink outline-solid";
  return "";
}

type ContentProps = { cell: Cell; index: number; lies: boolean; justMarked: boolean };

function CellContent({ cell, index, lies, justMarked }: ContentProps) {
  switch (cell.kind) {
    case "given":
      return (
        <>
          <Digit value={cell.value} index={index} party={lies} />
          {cell.stamped && <FalseStamp fresh={justMarked} />}
        </>
      );
    case "observation":
      return <Digit value={cell.value} index={index} party={false} />;
    case "marked":
      return (
        <CameraIcon
          className={`relative size-[62%] ${cell.wrong ? "opacity-35" : ""} ${justMarked ? "motion-safe:animate-snap" : ""}`}
        />
      );
    case "exposed":
    case "revealed":
      return <CameraIcon className="relative size-[62%]" />;
    case "wall":
    case "hidden":
      return null;
  }
}

/**
 * The floor plan drawn in every cell but a wall: an office cubicle seen from above. Partition
 * walls on four sides with a doorway in the front, an L-shaped desk against the back and left,
 * and, in a cell that shows nothing else, a monitor on the desk and a chair in front of it (they
 * would crowd a digit or icon). Drawn on a 100-unit square so it scales with the cell. It is
 * decoration only, faint enough that digits and icons stay the cell's message.
 *
 * Off by default: it only exists in dev builds and shows while the Developer tools toggle is on
 * (the `cubicles` variant). Opened cells then use `--concrete`, so they stay distinct from hidden ones.
 */
function Cubicle({ onRed, furnished }: { onRed: boolean; furnished: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      shapeRendering="crispEdges"
      className={`pointer-events-none absolute inset-0 hidden size-full cubicles:block ${onRed ? "text-paper" : "text-ink"}`}
    >
      <g fill="currentColor">
        {/* Partitions: back, left, right, and the front with a doorway on the right. */}
        <path
          opacity={onRed ? 0.4 : 0.34}
          d="M7 7h86v7H7z M7 14h7v79H7z M86 14h7v79h-7z M14 86h40v7H14z"
        />
        {/* The L-shaped desk. */}
        <path opacity={onRed ? 0.22 : 0.13} d="M14 14h72v20H14z M14 34h20v30H14z" />
        {furnished && (
          <>
            {/* The monitor, seen edge-on from above, and its stand. */}
            <path opacity={0.4} d="M38 18h26v5H38z M48 23h6v4h-6z" />
            {/* The chair: seat and backrest, pulled out from the desk. */}
            <path opacity={0.2} d="M43 44h16v15H43z" />
            <path opacity={0.3} d="M41 59h20v5H41z" />
          </>
        )}
      </g>
    </svg>
  );
}

/**
 * How far each typed digit sits off true, like the uneven strike of a worn typebar. Picked by
 * cell index, so a digit keeps its set when the board re-renders.
 */
const TYPE_SET = [
  "rotate-[-2deg] translate-y-px",
  "rotate-[1.5deg] -translate-x-px",
  "rotate-0 -translate-y-px",
  "rotate-[-1deg] translate-x-px",
  "rotate-[2deg]",
  "rotate-[0.5deg] translate-y-px -translate-x-px",
] as const;

/**
 * A number on the record, typed in the board's face (IBM Plex Mono, semibold: an electric office
 * typewriter's clean, even strike), set slightly off true. A true number is always ink (design
 * rule 3); only Party records are red.
 */
function Digit({ value, index, party }: { value: number; index: number; party: boolean }) {
  return (
    <span
      className={`relative font-board text-[length:calc(100cqi/var(--cols)*0.56)] leading-none font-semibold ${party ? "text-party" : "text-ink"} ${TYPE_SET[(index * 7 + 3) % TYPE_SET.length]}`}
    >
      {value}
    </span>
  );
}

/**
 * The player's False stamp on a Party record. A `fresh` stamp, just put down, thunks in wet with
 * ink; one already on the record when the board appears stays still.
 */
function FalseStamp({ fresh }: { fresh: boolean }) {
  return (
    <span
      className={`pointer-events-none absolute inset-x-[2px] bottom-[3px] -rotate-8 border-[1.5px] border-party bg-paper/70 text-center font-stencil text-[length:calc(100cqi/var(--cols)*0.2)] leading-[1.1] font-black tracking-[0.04em] text-party uppercase ${fresh ? "motion-safe:animate-thunk" : ""}`}
    >
      False
    </span>
  );
}
