import { PRIVACY_INTRO, PRIVACY_SECTIONS, PRIVACY_UPDATED } from "../game/privacy.ts";
import { TextLink } from "./TextLink.tsx";

/**
 * The privacy notice, a page of its own (privacy.html) so it has a stable address to link to.
 * Plain words, not the game's fiction: it has to be understood by anyone. The words live in
 * game/privacy.ts.
 */
export function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-(--sheet-max) flex-col gap-(--space-4) px-(--space-5) pt-5 pb-10">
      <header className="grid gap-0.5 border-b-3 border-ink pb-(--space-3)">
        <p className="text-[12px] tracking-[0.12em] text-muted uppercase">Surveilled</p>
        <h1 className="font-stencil text-[clamp(40px,11vw,64px)] leading-[0.9] font-black uppercase">
          Privacy notice
        </h1>
        <p className="mt-(--space-1) text-[13px]">Last updated {PRIVACY_UPDATED}</p>
      </header>

      <p>{PRIVACY_INTRO}</p>

      {PRIVACY_SECTIONS.map((section) => (
        <section key={section.title} className="grid gap-(--space-2)">
          <h2 className="text-[13px] font-bold tracking-[0.06em] uppercase">{section.title}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.items !== undefined && (
            <ul className="grid list-[square] gap-(--space-2) pl-(--space-5)">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <p className="border-t border-dashed border-ink pt-(--space-3)">
        <TextLink href="/">Back to the game</TextLink>
      </p>
    </main>
  );
}
