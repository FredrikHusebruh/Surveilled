"""Seed made-up finished days into Supabase's `day_results`, so a standing has others to compare
with while testing. Dev mode only.

    uv run python -m scripts.seed_standings                 # 400 players for today (local date)
    uv run python -m scripts.seed_standings --players 1000 --day 2026-11-18
    uv run python -m scripts.seed_standings --clear         # remove today's seeded rows

Every seeded row's player hash starts with SEED_PREFIX. A real player's hash is a SHA-256 and
starts with it about once in 18 quintillion, so --clear only ever removes seeded rows. Seeding is
deterministic per day and skips rows that already exist, so running it twice adds nothing.
"""

import argparse
import math
import random
import sys
from datetime import date

from app.clients import get_supabase_rest
from app.config import get_settings
from app.models.daily import LEVEL_COUNT

SEED_PREFIX = "5eed5eed5eed5eed"

# How far seeded players get: filed 0 (seen on I) to 4 (toppled), roughly a hard-day shape.
_REACH_WEIGHTS = (0.05, 0.07, 0.13, 0.20, 0.55)


def seeded_rows(day: date, players: int) -> list[dict[str, object]]:
    """`players` made-up results for `day`, the same every time for the same day."""
    rng = random.Random(f"surveilled-seed-{day.isoformat()}")
    rows: list[dict[str, object]] = []
    for index in range(players):
        filed = rng.choices(range(LEVEL_COUNT + 1), weights=_REACH_WEIGHTS)[0]
        # Adjusted time grows with every level played; log-normal gives the long slow tail.
        median_seconds = 220 * (filed + 1) + (420 if filed == LEVEL_COUNT else 0)
        score = round(rng.lognormvariate(math.log(median_seconds), 0.38))
        rows.append(
            {
                "day": day.isoformat(),
                "player_hash": f"{SEED_PREFIX}{index:048x}",
                "levels_filed": filed,
                "score_seconds": max(30, score),
            }
        )
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed or clear made-up standings in Supabase.")
    parser.add_argument("--day", type=date.fromisoformat, default=date.today())
    parser.add_argument("--players", type=int, default=400)
    parser.add_argument("--clear", action="store_true", help="remove the day's seeded rows")
    args = parser.parse_args()
    day: date = args.day

    if not get_settings().dev_mode:
        print("Refusing: seeding is a dev tool. Set SURVEILLED_DEV_MODE=true.", file=sys.stderr)
        return 1
    client = get_supabase_rest()

    if args.clear:
        response = client.delete(
            "/day_results",
            params={"day": f"eq.{day.isoformat()}", "player_hash": f"like.{SEED_PREFIX}*"},
            headers={"Prefer": "return=representation"},
        )
        response.raise_for_status()
        print(f"Removed {len(response.json())} seeded rows for {day.isoformat()}.")
        return 0

    rows = seeded_rows(day, args.players)
    response = client.post(
        "/day_results",
        params={"on_conflict": "day,player_hash"},
        headers={"Prefer": "resolution=ignore-duplicates,return=minimal"},
        json=rows,
    )
    response.raise_for_status()
    print(f"Seeded {len(rows)} players for {day.isoformat()} (existing seed rows were kept).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
