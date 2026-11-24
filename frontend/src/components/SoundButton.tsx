import { SOUND } from "../game/copy.ts";
import { useSound } from "../hooks/useSound.ts";

/**
 * The sound switch: a small square function tab on the typewriter, left of the keys, in the same
 * enamel as the machine. "Sound on" or "Sound off" in two short lines; 44px to the finger.
 */
export function SoundButton() {
  const sound = useSound();
  return (
    <button
      type="button"
      onClick={sound.toggle}
      className="grid size-12 shrink-0 cursor-pointer place-items-center border-2 border-slate bg-ink px-0.5 text-center text-[11px] leading-[1.15] font-bold text-paper/80 hover:text-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-party focus-visible:outline-solid"
    >
      {sound.on ? SOUND.on : SOUND.off}
    </button>
  );
}
