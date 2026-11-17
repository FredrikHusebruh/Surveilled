import json

import httpx
import pytest

from app.models.game import GameStatus
from app.models.standing import DayScore
from app.services.errors import RankingsUnavailableError
from app.services.scoring import level_score
from app.services.standings_store import CURVE_BINS, SupabaseStandings, UnconfiguredStandings
from tests.conftest import TEST_LAYOUT
from tests.factories import START_TIME, TODAY, make_game, make_puzzle

PLAYER_HASH = "a" * 64
FILED = make_game(make_puzzle(TEST_LAYOUT), status=GameStatus.WON, finished_at=START_TIME + 90)
SCORE = DayScore(levels=(level_score(1, FILED),))
ROW: dict[str, object] = {
    "players": 40,
    "ahead_of": 31,
    "levels_filed": 1,
    "score_seconds": 90,
    "reached": [3, 1, 0, 0, 36],
    "curve": {"low_seconds": 60, "high_seconds": 900, "counts": [1] * CURVE_BINS},
}


def _store(transport: httpx.MockTransport) -> SupabaseStandings:
    client = httpx.Client(base_url="https://x.supabase.co/rest/v1", transport=transport)
    return SupabaseStandings(client)


def test_it_records_through_the_database_function_and_reads_the_ranking() -> None:
    seen: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, json=ROW)

    standing = _store(httpx.MockTransport(respond)).record(TODAY, PLAYER_HASH, SCORE)

    [request] = seen
    assert request.url.path == "/rest/v1/rpc/record_day_result"
    assert json.loads(request.content) == {
        "p_day": "2026-11-20",
        "p_player_hash": PLAYER_HASH,
        "p_levels_filed": 1,
        "p_score_seconds": 90,
        "p_bins": CURVE_BINS,
    }
    assert standing.players == 40
    assert standing.ahead_of == 31
    assert standing.reached == (3, 1, 0, 0, 36)
    assert standing.curve.counts == (1,) * CURVE_BINS


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(500, json={"message": "boom"}),
        httpx.Response(200, json={**ROW, "players": 0}),
        httpx.Response(200, json={**ROW, "reached": [1, 2]}),
        httpx.Response(200, text="not json"),
    ],
)
def test_a_failed_or_malformed_answer_makes_rankings_unavailable(response: httpx.Response) -> None:
    store = _store(httpx.MockTransport(lambda _: response))

    with pytest.raises(RankingsUnavailableError):
        store.record(TODAY, PLAYER_HASH, SCORE)


def test_an_unreachable_project_makes_rankings_unavailable() -> None:
    def refuse(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused", request=request)

    with pytest.raises(RankingsUnavailableError):
        _store(httpx.MockTransport(refuse)).record(TODAY, PLAYER_HASH, SCORE)


def test_without_supabase_every_standing_is_unavailable() -> None:
    with pytest.raises(RankingsUnavailableError):
        UnconfiguredStandings().record(TODAY, PLAYER_HASH, SCORE)
