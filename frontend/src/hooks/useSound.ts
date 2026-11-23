import { useCallback, useSyncExternalStore } from "react";
import { setSoundOn, soundOn, subscribeSound } from "../lib/sound.ts";

/** Whether the sound is on, and a toggle that remembers the choice in this browser. */
export function useSound() {
  const on = useSyncExternalStore(subscribeSound, soundOn);
  const toggle = useCallback(() => setSoundOn(!soundOn()), []);
  return { on, toggle };
}
