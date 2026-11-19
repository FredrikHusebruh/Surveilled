---
paths:
  - "**/*.html"
  - "**/*.css"
  - "**/*.js"
  - "**/*.ts"
  - "**/*.tsx"
---

# Surveilled design rules

Surveilled is a daily logic puzzle set in the Ministry of Truth, where hidden CCTV cameras watch every corridor. Each day brings four records, played in order; filing the fourth topples the government. Every screen is a filled-in government form: cold, square, typed, stamped. Follow these rules for any UI, styling, copy or asset change.

## Tokens (use these exact values, as CSS variables)

```css
:root {
  --concrete: #c3c7bf; /* page background */
  --paper: #e9ebe4; /* hidden cells, buttons, panels */
  --cleared: #d6d9d1; /* cells that show a number */
  --ink: #1b1f1d; /* all text, board frame, true (black) numbers */
  --slate: #3a413d; /* walls only, never text */
  --muted: #4a514c; /* secondary text (replaces old #545c56, which failed contrast) */
  --party: #b3261e; /* Party: red numbers, stamps, strikes, primary button fill */
  --party-text: #9a2019; /* red text under 24px on concrete */
  --gaze: #e4c24f; /* sight-line highlight on hidden cells */
  --gaze-number: #d9c46e; /* sight-line highlight on numbered cells */
  --siren: #2b4fd6; /* police blue: the loss siren only, never text or UI */
  --dossier: #e3d3af; /* manila: the folder only, as the base of its shades */
  --coffee: #6f4520; /* the coffee ring on the orders and the day's last report, always translucent */

  --font-display:
    "Big Shoulders Stencil Display", Impact, "Arial Narrow", sans-serif;
  --font-digit: "Big Shoulders Display", Impact, "Arial Narrow", sans-serif;
  --font-body: "Courier Prime", "Courier New", Courier, monospace;

  --space-board: 3px;
  --space-1: 4px;
  --space-2: 6px;
  --space-3: 10px;
  --space-4: 14px;
  --space-5: 16px;
  --cell-max: 60px;
  --sheet-max: 500px;
  --shadow-tile: inset 0 -4px 0 rgba(27, 31, 29, 0.16);
  color-scheme: light;
}
```

Never hard-code a color, font or spacing value that has a token. Never add a new color without asking.

In the React app these tokens live in `frontend/src/index.css` and reach Tailwind through `@theme inline`: colors as `bg-concrete`, `text-party`, `border-ink` and so on (Tailwind's default palette is removed), the three faces as `font-stencil`, `font-condensed` and `font-typewriter`, and the other tokens as `gap-(--space-4)`, `max-w-(--sheet-max)` and `shadow-(--shadow-tile)`. The animations are `motion-safe:animate-thunk`, `motion-safe:animate-blink`, the `motion-safe:transition-colors` sweep on cells, and the alarms: `motion-safe:animate-shake`, `motion-safe:animate-alarm`, `motion-safe:animate-siren-red` and `motion-safe:animate-siren-blue` (see `AlarmOverlay.tsx` and `ShakeOnAlarm.tsx`).

## The ten rules

1. **One theme.** No dark mode, no seasonal reskins. Concrete ground, paper for anything touchable, ink for anything readable.
2. **Red means the Party, nothing else.** `--party` is only for Party records (red numbers), the red corner tick, False stamps, verdicts, strikes and the single primary button per view. Never for decoration, links, errors that aren't strikes, or promos.
3. **Black is the truth.** Numbers the player uncovers are always `--ink`. Never tint or fade a true number.
4. **No rounded corners.** `border-radius: 0` everywhere. The only curves are the camera icon's lens, the folder's wax seal and the coffee ring on the orders and the day's last report.
5. **The board is the hero.** Nothing overlaps it: no ads, banners, tooltips, toasts or modals. Messages go below it. Two exceptions: the alarm light from rule 9, which never takes input and never hides the board for more than a moment, the Archivist's report, which comes up on a sheet once a record closes (after a beat to see the board; after a loss, once the siren is over) and can be closed with its × and brought back with "Show report"; and the How to play overlay, which the player opens on purpose (from the start page, or the "?" in the status strip during a record) and closes at will. The record's clock keeps running while it is open.
6. **Raised means hidden.** Only hidden cells get `--shadow-tile`. Numbered cells and walls are flat. No other shadows, no gradients, no blur.
7. **Three faces, three jobs.** Stencil (`--font-display`, 900, uppercase) names things: masthead, verdicts, section heads, level numerals. Condensed (`--font-digit`, 800, tabular-nums) shows numbers. Typewriter (`--font-body`) explains. Load each Google font with its own `<link>` so one failure doesn't break the others.
8. **Yellow is attention, never state.** `--gaze` only shows what a selected number can see. Don't use it for warnings or success.
9. **Eight moments of motion.** The False stamp thunk, the sight-line sweep (45ms delay per cell of distance, outward), the blinking hint outline, opening the folder, the orders unfolding and typing themselves out (about 400 characters a second, a block cursor on the next character, tap the page to finish), the How to play demos, and two alarms. The demos step through their frames every 1.8s (holding the last for 3s), always have a Pause button, and start paused for reduced motion. Opening the folder takes about 1.2s: the seal and ribbon break, the cover swings open towards the player (rotating on its left hinge and fading as it passes edge-on), the orders lift out; then they unfold. A strike shakes the board once and pulses a red glow around the screen edge once. A loss runs the siren: `--party` red and `--siren` blue lights alternating from the top corners plus a split light bar, four cycles of 0.8s. The alarms are the only place gradients and glow are allowed. Flashing stays at or under 1.25 per second per light (WCAG 2.3.1 allows three) and never fills the screen with saturated red. Nothing else animates. Wrap everything in `@media (prefers-reduced-motion: no-preference)`; with reduced motion the alarms are not rendered at all.
10. **Every word is a form.** Short, flat, bureaucratic second-person sentences. No exclamation marks, no emoji, no praise, no jokes.

## The board

- Square cells (`aspect-ratio: 1`), board width `min(100%, cols * var(--cell-max))`, `--space-board` gap showing `--ink` as the grid. Cells must stay at least 44px on phones: no more than 7 columns on mobile.
- Cells are plain fills. Dev builds can draw every cell but a wall as an office cubicle seen from above (`Cubicle` in `BoardCell.tsx`) with the "Show cubicles" toggle in Developer tools, which sets `data-cubicles` on `<html>` for the `cubicles` Tailwind variant. With it on, opened cells use `--concrete` so they stay distinct from hidden ones. Production never renders it.
- Each cell state has one look:
  - hidden: `--paper`, `--shadow-tile`
  - wall: `--slate`, flat
  - observation: `--cleared`, `--ink` digit
  - Party record: `--cleared`, `--party` digit, 9px red corner triangle top-left
  - marked camera: `--paper`, `--ink` camera icon
  - exposed camera: `--party` fill, `--paper` icon
  - once the record closes: unmarked cameras show a `--party` icon; wrong marks get a `--party` strike-through
- Interaction states are outlines, never fills: selected number = 3px solid `--ink` outline (offset -3px); hinted cell = 3px dashed `--party` outline (offset -4px); keyboard focus = 3px solid `--party`.
- Board digit size: `calc(100cqi / var(--cols) * .56)` with the board as a size container.

## Layout

- One column, `max-width: var(--sheet-max)`, side gutters `--space-5` at every width, sections separated with `gap: var(--space-4)`.
- **Start page (a record not yet opened):** masthead, then the sealed folder under a "Sealed record · Open on receipt." heading, then exactly two buttons side by side: "Open record" (primary) and "How to play", with one muted line below ("Read your orders first. The clock starts when you start the operation."). No level tabs, brief or board. "How to play" opens the How to play overlay. "Open record" opens the folder and then shows the **operation orders** in its place. Every record of the day arrives this way, so "Next record" leads to the next sealed folder.
- **Open record:** masthead, level tabs, level brief, status strip, board, message line, controls (or, once the record closes, a full-width "Show report" button, primary while the report is closed). A quiet "?" sits at the right end of the status strip's clock row, just above the board, and opens How to play: a 22px box with a 1px `--muted` border and a `--muted` 13px bold typewriter glyph, ink on hover, with a 44px hit area. Never louder than the clock beside it (`HelpButton.tsx`). The status strip always has two rows: counts on top, then the clock and the "?". There is no standing-orders section: the rules live in the How to play overlay, one tap away on every screen.
- **Operation orders:** the typewritten letter from inside the folder (`Briefing.tsx`), on white `--paper` (the same paper peeks out of the folder and lifts out as it opens). It unfolds from the top with two faint fold creases (`--ink` at 10%) and a "TOP SECRET" stamp in the corner, and a coffee ring (`CoffeeStain.tsx`, also on the day's last report: translucent `--coffee` at 7–30%, multiplied into the paper, rotated in the top-right corner and running off the top and right edges, clear of the story text) then types out: an uppercase letterhead (Operation Blind Spot, "Assignment I of IV · Open floor", Day, From: The Archivist, To: Clerk, Records Department), a dashed rule, the level's backstory as a letter ("Clerk," … "— The Archivist"), an "Orders" section numbering the level's brief and its play orders, another dashed rule, then a muted "Destroy after reading" line and the one primary button, "Start operation". Story and orders live in `frontend/src/game/briefings.ts`, one entry per level, in our own words: never Orwell's text, characters or organisations.
- **Report:** when a record closes, the Archivist's typewritten report on a sheet above the board (`Report.tsx` inside `Sheet.tsx`), on the same `--paper` as the orders: an uppercase letterhead (Operation Blind Spot, "Report · Assignment II of IV · Corridors", Day, From: The Archivist), a dashed rule, the verdict stamp, a short letter ("Clerk," … "— The Archivist", words in `reportLetter` in `briefings.ts`), the result line, and once the day is over the **standing**, the countdown and "Share result" (which copies the share card; the card itself isn't shown on the report). The standing (`StandingSection.tsx`) sits under the sign-off: a bold uppercase "Standing" label, a stencil headline in `--ink` ("Top 8% of clerks today." when in the top half, otherwise "Further than 40% of clerks today." after being seen or "Better than 30% of clerks today."), the chart and a score receipt: "Time", then a line per penalty taken ("2 hints +01:00", "1 strike +01:00"), then "Score" under a 1px `--ink` rule, labels in typewriter and values right-aligned in condensed digits. No sentences. The chart (`StandingChart.tsx`) is square bars with 2px gaps on a 1px `--ink` baseline: faint `--ink` at 25%, the player's bar solid `--ink` with a "You" label, a muted caption above and end labels below. After toppling it shows the spread of toppled players' scores, fast on the left; after being seen, how far everyone got (Seen on I … Toppled). No red: it is not the Party's. With too few players it says so instead of a percentage. The reports that end the day ("Seen", "Toppled") carry the coffee ring in the top-right corner; "Rectified" between records does not.
- A level's clock starts only when the player presses "Start operation": never on page load, opening the folder or reading the orders. The masthead's record number reads "Sealed" until then.
- Masthead: department eyebrow (12px, uppercase, `letter-spacing: .12em`, `--muted`) ending in the day number ("Ministry of Truth · Records Department · Day 34"), game name in stencil `clamp(44px, 13.5vw, 80px)`, form line ("Form 1984-B", "Record no. 04127"), then a 3px `--ink` rule. Once the government is toppled the eyebrow reads "~~Ministry of Truth~~ · Dissolved · Day 34", with the Ministry's name struck through.
- Status strip: 1px `--ink` rules top and bottom; values in `--font-digit` 22px.

## Components

- **Buttons:** `--paper` fill, 1.5px `--ink` border, 14px bold body font, square. Primary: `--party` fill and border, `--paper` text, at most one per view.
- **Cookie notice:** a `--paper` panel with a 1.5px `--ink` border at the foot of the page, in the normal flow (never fixed, never over the board): one sentence ("Surveilled uses one cookie, to keep your game on our server. No tracking, no ads, no analytics.") with a "Privacy notice" link, and a plain "Acknowledge" button. It informs; there is no Decline. Once acknowledged it is gone for good in that browser.
- **Links:** `--ink`, underlined (2px on hover), the red keyboard focus outline. Never red (`TextLink.tsx`).
- **Privacy notice page:** `privacy.html`, the same one-column sheet: a muted "Surveilled" eyebrow, "Privacy notice" in stencil, the date, the 3px `--ink` rule, then sections with bold uppercase 13px heads, plain typewriter text and square bullets, and "Back to the game" under a dashed rule. Plain language, not the game's fiction. Every game page ends with a footer link to it.
- **Hint button:** a plain button beside the mode toggle: "Hint" over a row of 8px squares, one per hint of the day (three, shared by all levels), solid `--ink` while left and an empty 1.5px `--ink` box once used. Disabled once none are left. Its `aria-label` says the count ("Hint, 2 of 3 left today").
- **Mode toggle:** joined segmented buttons in one 1.5px `--ink` frame; the pressed one is `--ink` with `--paper` text. Use `aria-pressed`.
- **Level tabs:** 4-column grid, 1.5px `--ink` border, Roman numeral in stencil 20px, name, then the state in 11px: Locked, Open, In progress, Filed, or Seen (in `--party-text`). Locked tabs are disabled. Current tab inverted (`--ink` fill) with `aria-current="true"`.
- **Folder:** a manila file folder (`Folder.tsx`), flat fills mixed from `--dossier` with `--ink` (front cover 7%, back cover and tab 14%) and 1.5px `--ink` edges. The back cover has a file tab top-left reading "Blind Spot"; the white `--paper` orders peek out over the top edge. The front cover is hinged on the left and carries a small "Records Department" print, a "TOP SECRET" stamp and a pasted `--paper` label ("Ministry of Truth", "Record I of IV", "Day 2 · Eyes only"), each on one line at every width. A `--party` ribbon is tied round the right side, closed with the Ministry's wax seal: a flat `--party` blob with an uneven poured edge and a pressed `--paper` ring, holding the camera icon in `--paper`. It sizes in `cqi`, so it scales with the sheet.
- **Sheets:** How to play and the report share one overlay (`Sheet.tsx`): a native modal `<dialog>` with a square × top-right, closing with the ×, Escape or a backdrop click, locking page scroll and returning focus.
- **How to play overlay:** a sheet in the page's width, on `--paper`, over a 75% `--ink` backdrop. Its buttons stay `--paper` and the demos keep their `--concrete` frame. Header: "Standing orders · Page N of 7" eyebrow, "How to play" in stencil, and a square close button showing "×" (the one glyph allowed besides the camera icon, labelled "Close"). Each page: a stencil title, an animated demo in a `--concrete` frame with a caption and a Pause button, then the rule in a few short paragraphs. Footer: square page markers on their own row, then Previous and Next (Start on the last page, the one primary). It closes with the ×, Escape, a backdrop click or Start, turns pages with the arrow keys, and returns focus to How to play. Demos use the real board cells and level tabs, inert and hidden from assistive tech; their boards are written in the notation in `frontend/src/game/tutorial.ts` and must stay consistent (every number matches its cameras).
- **Stamps:** stencil uppercase in `--party` with a `--party` border, rotated (-8deg for False on a cell, -3deg for verdicts). Verdict words are only "Rectified" (a record filed), "Toppled" (the fourth record filed) and "Seen" (three strikes).
- **Icon:** the only icon is the CCTV camera (plus the "?" that opens How to play and the "×" that closes it, both labelled for screen readers) (housing tilted toward the viewer, lens, wall bracket; 24px grid, 2px stroke, `currentColor`), in `frontend/src/components/CameraIcon.tsx`. Don't add icon libraries or other icons; use words.

## Copy

- Fixed vocabulary: the watchers = **cameras** (never telescreens); puzzle = **record**; finishing = **filing**; win = **Rectified**; final win = **Toppled**; loss = **Seen**; the day's four puzzles = **levels** (I to IV); rules = **Standing orders**; red given numbers = **Party records**; uncovered numbers = **your observations**; mistakes = **strikes**; subscription = **Clearance**.
- Buttons: verb first, sentence case ("Open record", "Start operation", "How to play", "Next record", "Share result", "Mark camera").
- Never quote Orwell's text. Use the setting in our own words.

## Growth and money surfaces

- **Share card** is spoiler-free plain text, built in `frontend/src/game/share.ts` and copied by "Share result" once the day is over (it isn't shown on the report):
  ```
  SURVEILLED · Day 34
  I   ■ 00:48
  II  ■ 02:15
  III ■ 05:02 · 1 strike
  IV  ■ 11:40 · 2 hints
  REGIME TOPPLED · 20:45
  Score 22:45 · top 8% of 1,204 clerks
  Toppled 3 days running
  https://…
  ```
  A seen level reads `□ Seen` and the last line becomes `SEEN ON LEVEL III`. The score line appears once the standing has arrived ("Score 06:10 · further than 40% of 312 clerks", or just the score while too few have finished). Never include board positions.
- **Daily records:** the same four records for everyone each day, opening at the player's local midnight. The day number goes in the eyebrow only. A countdown to the next records appears once the day is over.
- **Ads:** never on or next to the board, never during a solve. Only below the controls or between records, in a plain `--paper` panel labelled "Advertisement" in `--muted`.
- **Clearance (subscription):** styled like a level tab. No gold, gradients, badges or countdown timers.

## Accessibility

- Text contrast at least 4.5:1 (3:1 for 24px+). `--party` text under 24px on `--concrete` must use `--party-text` instead.
- Every cell is a `<button>` with an `aria-label` that includes its state and "row N, column M".
- Support tap, long-press (430ms) and right-click to mark; arrow keys move focus on the board; `m` or `f` marks.
- Game state lives on the server, keyed by an anonymous httpOnly cookie. The browser keeps only per-viewer conveniences (the toppling streak, the acknowledged cookie notice) in `localStorage`, always through `frontend/src/lib/storage.ts`, which wraps every access in try/catch.
