import { useSyncExternalStore } from "react";
import type { Pointer } from "../game/copy.ts";

const COARSE = "(pointer: coarse)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(COARSE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function snapshot(): Pointer {
  return window.matchMedia(COARSE).matches ? "touch" : "mouse";
}

/**
 * Whether the player's main pointer is a finger or a mouse, so gesture help names only the gesture
 * they can make (press and hold, or right-click). It follows changes, as when a tablet docks to a
 * keyboard and trackpad. Both gestures always work; this only picks the words.
 */
export function usePointer(): Pointer {
  return useSyncExternalStore(subscribe, snapshot);
}
