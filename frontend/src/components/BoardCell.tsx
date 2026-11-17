import type { Cell } from "../api/schemas.ts";
import { cellLabel } from "../game/copy.ts";
import { CameraIcon } from "./CameraIcon.tsx";

const SWEEP_MS_PER_STEP = 45;

type Props = {
  cell: Cell;
  index: number;
  lies: boolean;
  position: string;
  /** Distance from the selected number, when this cell is in its sight lines. */
  gazeDistance: number | undefined;
  selected: boolean;
  hinted: boolean;
};

/**
 * One board cell. Each state has exactly one look (design.md, "The board"); interaction states
 * are outlines, never fills. Input is handled by the board, which reads `data-cell`.
 */
export function BoardCell({ cell, index, lies, position, gazeDistance, selected, hinted }: Props) {
  const gazed = gazeDistance !== undefined;
  return (
    <button
      type="button"
      data-cell={index}
      tabIndex={cell.kind === "wall" ? -1 : 0}
      aria-label={cellLabel(cell, lies, position)}
      className={`${BASE} ${surface(cell, lies, gazed)} ${outline(selected, hinted)}`}
      style={gazed ? { transitionDelay: `${gazeDistance * SWEEP_MS_PER_STEP}ms` } : undefined}
    >
      {import.meta.env.DEV && cell.kind !== "wall" && <Cubicle onRed={cell.kind === "exposed"} furnished={cell.kind === "hidden"} />}
      <CellContent cell={cell} lies={lies} />
    </button>
  );
}

const BASE =
  "relative grid aspect-square place-items-center select-none touch-manipulation [-webkit-touch-callout:none] focus-visible:z-10 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-party focus-visible:outline-solid motion-safe:transition-colors motion-safe:duration-180";

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

function CellContent({ cell, lies }: { cell: Cell; lies: boolean }) {
  switch (cell.kind) {
    case "given":
      return (
        <>
          <Digit value={cell.value} party={lies} />
          {cell.stamped && <FalseStamp />}
        </>
      );
    case "observation":
      return <Digit value={cell.value} party={false} />;
    case "marked":
      return <CameraIcon className={`relative size-[62%] ${cell.wrong ? "opacity-35" : ""}`} />;
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

/** A true number is always ink (design rule 3); only Party records are red. */
function Digit({ value, party }: { value: number; party: boolean }) {
  return (
    <span
      className={`relative font-condensed text-[length:calc(100cqi/var(--cols)*0.56)] leading-none font-extrabold tabular-nums ${party ? "text-party" : "text-ink"}`}
    >
      {value}
    </span>
  );
}

/** The player's False stamp on a Party record. It thunks in when it first appears. */
function FalseStamp() {
  return (
    <span className="pointer-events-none absolute inset-x-[2px] bottom-[3px] -rotate-8 border-[1.5px] border-party bg-paper/70 text-center font-stencil text-[length:calc(100cqi/var(--cols)*0.2)] leading-[1.1] font-black tracking-[0.04em] text-party uppercase motion-safe:animate-thunk">
      False
    </span>
  );
}
