import { COOKIE_NOTICE, PRIVACY_PATH } from "../game/privacy.ts";
import { Button } from "./Button.tsx";
import { TextLink } from "./TextLink.tsx";

/**
 * The cookie notice: a plain paper panel at the foot of the page, in the normal flow, so it never
 * covers the board (design rule 5). It informs; there is nothing to decline.
 */
export function CookieNotice({ onAcknowledge }: { onAcknowledge: () => void }) {
  return (
    <section
      aria-label="Cookie notice"
      className="grid gap-(--space-3) border-[1.5px] border-ink bg-paper p-(--space-4) text-[14px]"
    >
      <p>
        {COOKIE_NOTICE.text} <TextLink href={PRIVACY_PATH}>{COOKIE_NOTICE.link}</TextLink>
      </p>
      <Button className="justify-self-start" onClick={onAcknowledge}>
        {COOKIE_NOTICE.acknowledge}
      </Button>
    </section>
  );
}
