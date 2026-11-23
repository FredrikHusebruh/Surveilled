import { SOUND } from "../game/copy.ts";
import { useSound } from "../hooks/useSound.ts";

/**
 * The quiet switch for the typewriter sound, beside the "?" during a record and beside "Leave
 * training" in training. A small form box like the "?", 22px to the eye but 44px tall to the
 * finger (the negative margin keeps the larger hit area from moving anything). Never louder than
 * the clock beside it.
 */
export function SoundButton() {
  const sound = useSound();
  return (
    <button
      type="button"
      onClick={sound.toggle}
      className="group -my-[11px] grid h-11 shrink-0 cursor-pointer place-items-center focus-visible:outline-3 focus-visible:-outline-offset-8 focus-visible:outline-party focus-visible:outline-solid"
    >
      <span className="grid h-[22px] place-items-center border border-muted px-1.5 text-[12px] leading-none font-bold text-muted group-hover:border-ink group-hover:text-ink">
        {sound.on ? SOUND.on : SOUND.off}
      </span>
    </button>
  );
}
