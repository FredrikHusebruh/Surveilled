from dataclasses import dataclass, field
from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_standings_store
from app.main import app
from app.models.standing import DayScore, ScoreCurve, Standing
from app.player import PLAYER_COOKIE
from app.services.scoring import STRIKE_PENALTY_SECONDS
from app.services.standings_store import CURVE_BINS
from tests.conftest import TEST_CAMERAS
from tests.factories import TODAY

DAY = f"/api/daily/{TODAY.isoformat()}"

Call = tuple[date, str, DayScore]


@dataclass
class FakeStandings:
    """Ranks every recorded day as if nine others finished it, six of them behind."""

    calls: list[Call] = field(default_factory=list[Call])

    def record(self, day: date, player_hash: str, score: DayScore) -> Standing:
        self.calls.append((day, player_hash, score))
        return Standing(
            players=10,
            ahead_of=6,
            levels_filed=score.levels_filed,
            score_seconds=score.total_seconds,
            reached=(4, 0, 0, 0, 6),
            curve=ScoreCurve(low_seconds=0, high_seconds=600, counts=(1,) * CURVE_BINS),
        )


@pytest.fixture
def standings(client: TestClient) -> FakeStandings:
    """Swap Supabase for the fake. The `client` fixture clears the override afterwards."""
    fake = FakeStandings()
    app.dependency_overrides[get_standings_store] = lambda: fake
    return fake


def _get_seen(client: TestClient) -> None:
    client.post(f"{DAY}/levels/1/start")
    for camera in TEST_CAMERAS:
        client.post(f"{DAY}/levels/1/clear", json={"cell": camera})


def test_there_is_no_standing_while_the_day_is_in_play(
    client: TestClient, standings: FakeStandings
) -> None:
    client.post(f"{DAY}/levels/1/start")

    response = client.post(f"{DAY}/standing")

    assert response.status_code == 409
    assert response.json()["detail"] == "Your standing is ready once your day is over."
    assert standings.calls == []


def test_a_finished_day_is_scored_by_the_server_and_ranked(
    client: TestClient, standings: FakeStandings
) -> None:
    _get_seen(client)

    response = client.post(f"{DAY}/standing")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["dayNumber"] == 5
    assert body["levels"] == [
        {
            "level": 1,
            "filed": False,
            "seconds": 0,
            "hints": 0,
            "strikes": 3,
            "hintPenaltySeconds": 0,
            "strikePenaltySeconds": 3 * STRIKE_PENALTY_SECONDS,
            "totalSeconds": 3 * STRIKE_PENALTY_SECONDS,
        }
    ]
    assert body["totalSeconds"] == body["scoreSeconds"] == 3 * STRIKE_PENALTY_SECONDS
    ranking = (body["players"], body["aheadOf"], body["topPercent"], body["beatPercent"])
    assert ranking == (10, 6, 40, 66)
    # Seen on level I, so nobody got less far.
    assert body["furtherPercent"] == 0
    assert body["comparable"] is True


def test_the_database_never_sees_the_player_cookie(
    client: TestClient, standings: FakeStandings
) -> None:
    _get_seen(client)
    client.post(f"{DAY}/standing")

    [(day, player_hash, score)] = standings.calls
    cookie = client.cookies.get(PLAYER_COOKIE)
    assert day == TODAY
    assert cookie is not None
    assert player_hash != cookie
    assert len(player_hash) == 64
    assert score.levels_filed == 0


def test_without_supabase_rankings_are_unavailable(client: TestClient) -> None:
    _get_seen(client)

    response = client.post(f"{DAY}/standing")

    assert response.status_code == 503
    assert response.json()["detail"] == "Rankings are unavailable right now. Try again later."
