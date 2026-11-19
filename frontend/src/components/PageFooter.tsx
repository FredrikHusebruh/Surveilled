import { PRIVACY_PATH } from "../game/privacy.ts";
import { TextLink } from "./TextLink.tsx";

/** The page's foot: the privacy notice, always one link away. */
export function PageFooter() {
  return (
    <footer className="border-t border-ink pt-(--space-3) text-[13px] text-muted">
      <TextLink href={PRIVACY_PATH}>Privacy notice</TextLink>
    </footer>
  );
}
