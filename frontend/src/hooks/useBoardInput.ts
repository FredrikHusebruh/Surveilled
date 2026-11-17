import { useEffect, useRef } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent, SyntheticEvent } from "react";

const LONG_PRESS_MS = 430;
const CONTEXT_MENU_GRACE_MS = 900;

const ARROW_STEPS: Record<string, (cols: number) => number> = {
  ArrowUp: (cols) => -cols,
  ArrowDown: (cols) => cols,
  ArrowLeft: () => -1,
  ArrowRight: () => 1,
};

type Options = {
  cols: number;
  cellCount: number;
  onTap: (cell: number) => void;
  onMark: (cell: number) => void;
};

/**
 * Board input, delegated from the board element to its `[data-cell]` buttons: tap, long-press
 * (430ms) or right-click to mark, `m`/`f` to mark, and arrow keys to move focus.
 *
 * A long-press is followed by the browser's click (and on Android a context menu), so both are
 * swallowed once after it fires.
 */
export function useBoardInput({ cols, cellCount, onTap, onMark }: Options) {
  const timerRef = useRef<number | null>(null);
  const swallowClickRef = useRef(false);
  const lastLongPressRef = useRef(0);

  const cancelLongPress = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => cancelLongPress, []);

  return {
    onClick(event: MouseEvent<HTMLElement>) {
      if (swallowClickRef.current) {
        swallowClickRef.current = false;
        return;
      }
      const cell = cellFrom(event);
      if (cell !== null) onTap(cell);
    },
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0) return;
      const cell = cellFrom(event);
      if (cell === null) return;
      swallowClickRef.current = false;
      cancelLongPress();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        swallowClickRef.current = true;
        lastLongPressRef.current = Date.now();
        if ("vibrate" in navigator) navigator.vibrate(15);
        onMark(cell);
      }, LONG_PRESS_MS);
    },
    onPointerUp: cancelLongPress,
    onPointerCancel: cancelLongPress,
    onPointerLeave: cancelLongPress,
    onContextMenu(event: MouseEvent<HTMLElement>) {
      event.preventDefault();
      if (Date.now() - lastLongPressRef.current < CONTEXT_MENU_GRACE_MS) return;
      const cell = cellFrom(event);
      if (cell !== null) onMark(cell);
    },
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      const cell = cellFrom(event);
      if (cell === null) return;
      if (event.key === "m" || event.key === "f") {
        event.preventDefault();
        onMark(cell);
        return;
      }
      const step = ARROW_STEPS[event.key];
      if (step === undefined) return;
      event.preventDefault();
      const atLeftEdge = cell % cols === 0;
      const atRightEdge = cell % cols === cols - 1;
      if ((event.key === "ArrowLeft" && atLeftEdge) || (event.key === "ArrowRight" && atRightEdge)) return;
      const target = cell + step(cols);
      if (target < 0 || target >= cellCount) return;
      event.currentTarget.querySelector<HTMLElement>(`[data-cell="${target}"]`)?.focus();
    },
  };
}

function cellFrom(event: SyntheticEvent<HTMLElement>): number | null {
  if (!(event.target instanceof Element)) return null;
  const button = event.target.closest<HTMLElement>("[data-cell]");
  return button === null ? null : Number(button.dataset.cell);
}
