import { COOKIE_NOTICE, PRIVACY_PATH } from "../game/privacy.ts";
import { Button } from "./Button.tsx";
import { TextLink } from "./TextLink.tsx";

/**
 * The cookie notice: a compact paper slip in the normal flow, so it never covers the board (design
 * rule 5): at the foot of the folder page, or on the typewriter's body above the keys, where the
 * paper above gives it the room. It informs; there is nothing to decline.
 */
export function CookieNotice({ onAcknowledge }: { onAcknowledge: () => void }) {
  return (
    <section
      aria-label="Cookie notice"
      className="grid grid-cols-[1fr_auto] items-center gap-(--space-3) border-[1.5px] border-ink bg-paper p-(--space-2) text-[12px] leading-snug text-ink"
    >
      <p>
        {COOKIE_NOTICE.text} <TextLink href={PRIVACY_PATH}>{COOKIE_NOTICE.link}</TextLink>
      </p>
      <Button compact onClick={onAcknowledge}>
        {COOKIE_NOTICE.acknowledge}
      </Button>
    </section>
  );
}
