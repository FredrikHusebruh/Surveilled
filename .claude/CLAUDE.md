# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules

The project's coding rules live in [rules/](rules/), and Claude Code loads them automatically. Follow them for all new code. Where this file and a rule disagree, the rule wins.

- [engineering-principles.md](rules/engineering-principles.md): single responsibility, composition, fail loudly, immutability, doc comments, deleting unused code.
- [architecture.md](rules/architecture.md): backend layering (models → schemas → routers → services), frontend layering (components → hooks → API/types), the settings object, client factories.
- [security.md](rules/security.md): secrets, boundary validation, error responses, token storage, CORS, auth triggers.
- [supabase.md](rules/supabase.md): anon versus per-request versus service-role clients, and RLS.
- [testing.md](rules/testing.md): pytest for the backend, Vitest with React Testing Library for the frontend, and only once there's real behavior to test.
- [tooling.md](rules/tooling.md): `uv` for Python, lint and build before calling work done, Tailwind only, `import type`.
- [design.md](rules/design.md): the Surveilled visual system, covering design tokens, the ten design rules, board cell states, layout, components, fixed copy vocabulary and accessibility. It's scoped to `html/css/js/ts/tsx` files, so it loads only when those are being worked on. Follow it for any UI, styling, copy or asset change.

## What this is

Surveilled is a daily logic puzzle in the Ministry of Truth. Hidden CCTV cameras watch along rows and columns until a wall stops them. Each number counts the cameras that can see its cell. In levels III and IV, red Party records lie: exactly one per row is off by one. The player clears safe cells and marks cameras.

Every day brings four levels (I to IV), the same for every player, opening at the player's local midnight. They must be played in order. Each level has its own three strikes, and a third strike ends the player's day (one attempt per level per day). Filing level IV topples the government: the verdict is "Toppled" and the share card says "REGIME TOPPLED".

## How it fits together

The game is **server-authoritative**. The FastAPI backend builds the day's records, holds every player's games (including where the cameras are) and applies every move. The React frontend only renders the view the server returns and turns taps into API calls. So:

- **Rules live only in `backend/app/services/`.** Never re-implement a rule in the frontend. If the UI needs a new fact, add it to the view the server sends.
- **[game_view.py](../backend/app/services/game_view.py) decides what leaves the server.** Camera positions and the true counts of hidden cells stay hidden until the record closes. Any new field on `GameView` must keep that guarantee.
- **Players are anonymous.** [player.py](../backend/app/player.py) issues a random id in an httpOnly, SameSite=Lax cookie. Moves are addressed by `(player, day, level)`, so there are no game ids to guess. Runs live in [run_store.py](../backend/app/services/run_store.py), in memory: a restart forgets every run.
- **The day's progression is a model.** `DailyRun` in [models/daily.py](../backend/app/models/daily.py) derives each level's state (locked, open, playing, filed, seen) and the day's outcome (playing, toppled, out) from its four games. [daily_service.py](../backend/app/services/daily_service.py) enforces the order and the lock-out. Days within one day of UTC are open, which covers every time zone's local midnight.
- **Daily records need no scheduler or database.** [daily_puzzles.py](../backend/app/services/daily_puzzles.py) derives each level's record from `sha256(salt, day, level)`, so any server with the same `SURVEILLED_DAILY_SALT` builds the same records. The salt is secret, so tomorrow's records can't be precomputed. Changing the salt changes every day's records.
- **Difficulty is banded.** Each level in [levels.py](../backend/app/services/levels.py) draws its board size, walls and cameras at random, then keeps drawing until the record's `Grade` falls in the level's band. [grading.py](../backend/app/services/puzzle/grading.py) counts direct steps (one number suffices), combined steps (needs the camera total or the Party lie rule) and deep steps (needs several numbers together, or a hypothesis). The bands don't overlap, so every day gets strictly harder from I to IV. Retune them using the `surveilled.results` log lines that [results_log.py](../backend/app/services/results_log.py) writes when each record closes. They are anonymous: day, level, record, status, seconds, strikes, hints and rating.
- **Building records is slow** (level IV up to about 10 seconds), so [puzzle_warmer.py](../backend/app/services/puzzle_warmer.py) builds every open day's records in a background thread at startup and every 10 minutes after that. Never build a record while holding the run store's lock.
- **Generation is deterministic** and still matches the original JS engine exactly ([rng.py](../backend/app/services/puzzle/rng.py) reproduces mulberry32). `generate_puzzle(spec, seed)` takes a `BoardSpec`. Changing the generator, the solver, the grader or a level's ranges or band changes every day's records.
- **Moves are pure transitions.** [game_rules.py](../backend/app/services/game_rules.py) turns a frozen `Game` into a new one. `RunStore.update` applies a transition under a lock, so a move that raises changes nothing.
- **The solver** ([solver.py](../backend/app/services/puzzle/solver.py)) is shared by the generator, the grader and hints. Its internals are mutable for speed, but `find_forced` is pure.
- **Standings live in Supabase.** Once a day is over, the report calls `POST /api/daily/{day}/standing`. [standing_service.py](../backend/app/services/standing_service.py) scores the day from the server's own run ([scoring.py](../backend/app/services/scoring.py): adjusted time, the clock plus 30s per hint and 60s per strike, lower is better), then [standings_store.py](../backend/app/services/standings_store.py) calls the `record_day_result` database function ([supabase/migrations/](../supabase/migrations/)). It stores one row per (day, SHA-256 of the player id) where the first result stands, and returns the rank and a 16-bin curve, so no rows are pulled over the network. Days rank by levels filed, then score. Rows are keyed by the record date, so players in every time zone compare on the same day. Players keep finishing a day for about 36 hours, so a standing is only ever "so far" and the report fetches it again each time it opens. The secret key is server-only and created in [clients.py](../backend/app/clients.py); RLS is on with no policies and the public roles have no grants. Without `SURVEILLED_SUPABASE_URL` and `SURVEILLED_SUPABASE_SECRET_KEY` the app warns at startup and the endpoint answers 503. Changing a penalty changes how days compare, so only change it between days.
- **Dev mode.** With `SURVEILLED_DEV_MODE=true`, `DELETE /api/daily/{day}` resets your own day, lock-out included. Otherwise it answers 404. Development frontend builds show a "Reset today" button at the bottom of the page. Restarting the backend also wipes every run.

Frontend: a record the player hasn't opened shows as a sealed manila folder ([StartPage.tsx](../frontend/src/components/StartPage.tsx), [Folder.tsx](../frontend/src/components/Folder.tsx)). Opening it ([useRecordOpening.ts](../frontend/src/hooks/useRecordOpening.ts): sealed, opening, briefing) is client-only. The paper unfolds into typewritten operation orders ([Briefing.tsx](../frontend/src/components/Briefing.tsx)) whose backstory and orders per level live in [game/briefings.ts](../frontend/src/game/briefings.ts). Only "Start operation" calls the server, so the clock never runs while the player reads; `briefingFor` throws for a level with no briefing, so adding a level means writing one. Overlays share [Sheet.tsx](../frontend/src/components/Sheet.tsx) (a modal `<dialog>`; don't call `dialog.close()` on unmount, which queues a close event that shuts the next opening). When a record closes, the Archivist's report ([Report.tsx](../frontend/src/components/Report.tsx)) opens on a sheet by itself once per record ([useReport.ts](../frontend/src/hooks/useReport.ts)) and Show report brings it back. How to play ([HowToPlay.tsx](../frontend/src/components/HowToPlay.tsx)) is a sheet too, opened from the start page or the "?" in the status strip during a record. It replaces the old standing-orders section. Its seven pages and demo boards live in [game/tutorial.ts](../frontend/src/game/tutorial.ts). The demo boards are hand-drawn, so when a rule changes, update its page and keep every number consistent with its cameras. [useDaily.ts](../frontend/src/hooks/useDaily.ts) is the controller (UI-only state, the alarms, day rollover at local midnight, and mapping input to API calls). [api/schemas.ts](../frontend/src/api/schemas.ts) mirrors the backend schemas in zod, and every response is parsed through it. Once the day is over, the last report shows the standing ([StandingSection.tsx](../frontend/src/components/StandingSection.tsx), [StandingChart.tsx](../frontend/src/components/StandingChart.tsx)), fetched again each time the report opens ([useStanding.ts](../frontend/src/hooks/useStanding.ts)) because later time zones keep finishing the same day. Player-facing wording is in [game/copy.ts](../frontend/src/game/copy.ts), and the share card is built in [game/share.ts](../frontend/src/game/share.ts) and shared through [useShareCard.ts](../frontend/src/hooks/useShareCard.ts), which adds the standing line once it has arrived. The toppling streak is the only thing kept in localStorage.

The wire format is camelCase (`ApiModel` in [schemas/base.py](../backend/app/schemas/base.py) adds aliases); Python stays snake_case. Domain errors in [services/errors.py](../backend/app/services/errors.py) carry player-safe messages and are mapped to 404 or 409 in [error_handlers.py](../backend/app/error_handlers.py). Anything else is a generic 500.

## Frontend and backend in development

The frontend calls relative `/api/...` paths, and the Vite dev server ([frontend/vite.config.ts](../frontend/vite.config.ts)) proxies `/api` to `http://127.0.0.1:8000`. Every backend route lives under `/api`, and the backend must run on port 8000. The frontend dev server is pinned to 5173 with `strictPort`. There's no CORS middleware because the proxy makes requests same-origin. Production serving isn't set up yet; before deploying, add CORS with an explicit list of allowed origins (see [security.md](rules/security.md)).

## Supabase

Standings need a Supabase project. Set one up once:

1. Create a project at supabase.com.
2. Apply [supabase/migrations/](../supabase/migrations/) from the repo root with the Supabase CLI (pinned; [supabase/config.toml](../supabase/config.toml) is its config): `npx supabase@3.2.0 login` (opens the browser), `npx supabase@3.2.0 link --project-ref <ref>` (the ref is in the dashboard URL; it asks for the database password), then `npx supabase@3.2.0 db push --remote` (CLI 3 targets a local Docker stack without `--remote`; add `--dry-run` to preview). It applies only migrations the project hasn't had, so run it again after adding one. The secret key must be the `sb_secret_...` one: the publishable key is refused by design. Pasting a file into the dashboard's SQL Editor also works, but then the CLI doesn't know it was applied.
3. In `backend/.env`, set `SURVEILLED_SUPABASE_URL` (Project Settings > Data API) and `SURVEILLED_SUPABASE_SECRET_KEY` (Project Settings > API Keys, a `sb_secret_...` key; a legacy `service_role` key also works). Never give the key a `VITE_` prefix.

`SURVEILLED_STANDING_MIN_PLAYERS` sets how many finished days a day needs before the report shows a percentage (default 10; `.env.example` uses 1 for development). Schema changes go in a new migration file; never edit an applied one.

For testing, `uv run python -m scripts.seed_standings` (from `backend/`, dev mode only) adds 400 made-up finished days for today (`--day`, `--players`), and `--clear` removes them. Seeded rows are tagged by a `5eed5eed5eed5eed` player-hash prefix, so clearing never touches real players. They live in the same table as real results: clear them before real players arrive.

## Commands

Backend (run from `backend/`). Dependencies are managed with `uv`. `pyproject.toml` lists the direct dependencies and `uv.lock` pins everything:

```bash
cp .env.example .env                    # once: dev salt and dev mode; the app refuses to start without a salt
uv sync                                 # install into backend/.venv
uv run fastapi dev app/main.py          # dev server on :8000 with reload; API docs at /docs
uv add <package>                        # add a runtime dependency (uv add --dev for test-only)
uv run pytest                           # all tests (about 3s)
uv run pytest tests/services/test_game_rules.py::test_a_zero_cascades_but_skips_given_and_marked_cells
uv run pytest -k hints                  # tests whose names match
uv run ruff check                       # lint (add --fix for safe autofixes)
uv run ruff format                      # format; line length is 100
uv run pyright                          # strict type check of app/ and tests/
```

Before calling backend work done, run `uv run ruff check`, `uv run ruff format --check`, `uv run pyright` and `uv run pytest`. All four must pass. Pyright is strict and ruff requires annotations on every function, so type new code fully. Fix a finding rather than silencing it: no `# noqa`, no `# type: ignore`, no `Any` where a real type exists (see `GameChanges` in `tests/factories.py` for typed `**kwargs`).

Frontend (run from `frontend/`):

```bash
npm install
npm run dev       # Vite dev server on :5173
npm run build     # tsc -b (type check) then vite build
npm run lint      # oxlint
```

## Tests

Backend tests live in `backend/tests/`, laid out like `app/`. Things that aren't obvious:

- [tests/factories.py](../backend/tests/factories.py) builds boards from drawn layouts (`'#'` is a wall, `'C'` a camera, `'.'` a floor cell), so rules tests can name exact cells. Use it rather than generating records when a test needs a specific position.
- [tests/fixtures/js_engine_records.json](../backend/tests/fixtures/js_engine_records.json) holds RNG output and records from the original JavaScript engine. `test_generation_matches_the_js_engine` fails if generation drifts from it. If a generator change is deliberate, every published record changes, so regenerate the fixture on purpose; don't edit it to make the test pass.
- `TELESCREENS_SPECS` in factories are the original engine's four board specs, used for generator parity and hint tests.
- [tests/playthrough.py](../backend/tests/playthrough.py) plays a record by following hints only and fails if a hint ever points at a camera. The hint tests and `test_daily_records_can_be_filed_by_hints_alone` use it.
- The `fake_records` fixture makes the record book build a tiny hand-drawn board (`TEST_LAYOUT` in conftest, cameras at cells 0 to 2) instead of generating, so daily service and API tests are fast and know where the cameras are. The `client` fixture runs the real app with `get_daily_service` and `get_settings` overridden (fresh store, `FakeClock` at noon UTC on day 5, dev mode off), so tests never depend on a developer's `.env`. It also clears the Supabase settings, so tests never reach a real project: standings API tests override `get_standings_store` with `FakeStandings`, and `SupabaseStandings` is tested against `httpx.MockTransport`.

The frontend has no tests yet. When it has behaviour worth covering, set up Vitest as described in [testing.md](rules/testing.md).
