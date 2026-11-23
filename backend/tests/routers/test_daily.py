from datetime import timedelta
from typing import Any

from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app
from app.player import PLAYER_COOKIE
from tests.conftest import TEST_CAMERAS
from tests.factories import TODAY

DAY = f"/api/daily/{TODAY.isoformat()}"


def _start(client: TestClient, level: int) -> dict[str, Any]:
    response = client.post(f"{DAY}/levels/{level}/start")
    assert response.status_code == 200, response.text
    return response.json()


def _game(daily: dict[str, Any], level: int) -> dict[str, Any]:
    return daily["levels"][level - 1]["game"]


def _file(client: TestClient, level: int) -> dict[str, Any]:
    daily = _start(client, level)
    for cell, view in enumerate(_game(daily, level)["cells"]):
        if cell in TEST_CAMERAS or view["kind"] != "hidden":
            continue
        if _game(daily, level)["cells"][cell]["kind"] != "hidden":
            continue
        daily = client.post(f"{DAY}/levels/{level}/clear", json={"cell": cell}).json()["daily"]
    return daily


def test_a_new_visitor_gets_a_player_cookie_and_a_fresh_day(client: TestClient) -> None:
    response = client.get(DAY)

    assert response.status_code == 200
    cookie = response.headers["set-cookie"]
    assert f"{PLAYER_COOKIE}=" in cookie
    assert "HttpOnly" in cookie
    assert "samesite=lax" in cookie.lower()
    body = response.json()
    assert body["dayNumber"] == 5
    assert body["outcome"] == "playing"
    assert [lv["state"] for lv in body["levels"]] == ["open", "locked", "locked", "locked"]
    assert all(lv["game"] is None for lv in body["levels"])


def test_a_malformed_cookie_is_replaced_not_trusted(client: TestClient) -> None:
    client.cookies.set(PLAYER_COOKIE, "../../admin", path="/api")

    response = client.get(DAY)

    assert "../../admin" not in response.headers["set-cookie"]


def test_closed_days_and_unknown_levels_are_not_found(client: TestClient) -> None:
    far = (TODAY + timedelta(days=3)).isoformat()
    assert client.get(f"/api/daily/{far}").status_code == 404
    assert client.post(f"{DAY}/levels/9/start").status_code == 404
    assert client.get("/api/daily/not-a-date").status_code == 422


def test_levels_must_be_played_in_order(client: TestClient) -> None:
    locked = client.post(f"{DAY}/levels/2/start")

    assert locked.status_code == 409
    assert locked.json() == {"detail": "File the previous record first."}


def test_opening_a_level_hides_its_cameras(client: TestClient) -> None:
    daily = _start(client, 1)

    game = _game(daily, 1)
    assert daily["levels"][0]["state"] == "playing"
    assert {c["kind"] for c in game["cells"]} <= {"hidden", "given", "wall"}
    assert {"recordNo", "rating", "maxStrikes", "elapsedSeconds", "sightLines"} <= game.keys()


def test_filing_a_level_opens_the_next(client: TestClient) -> None:
    daily = _file(client, 1)

    assert [lv["state"] for lv in daily["levels"]][:2] == ["filed", "open"]
    assert _game(daily, 1)["status"] == "won"


def test_three_strikes_and_you_are_out(client: TestClient) -> None:
    _start(client, 1)
    responses = [
        client.post(f"{DAY}/levels/1/clear", json={"cell": camera}).json()
        for camera in TEST_CAMERAS
    ]

    assert [r["outcome"] for r in responses] == ["seen"] * 3
    final = responses[-1]["daily"]
    assert final["outcome"] == "out"
    assert final["levels"][0]["state"] == "seen"
    assert client.post(f"{DAY}/levels/2/start").status_code == 409


def test_four_filed_levels_topple_the_government(client: TestClient) -> None:
    days = [_file(client, level) for level in range(1, 5)]

    assert [d["outcome"] for d in days] == ["playing", "playing", "playing", "toppled"]


def test_mark_stamp_and_hints(client: TestClient) -> None:
    for level in range(1, 3):
        _file(client, level)
    _start(client, 3)
    url = f"{DAY}/levels/3"

    marked = client.post(f"{url}/mark", json={"cell": 3}).json()
    stamped = client.post(f"{url}/stamp", json={"cell": 5}).json()
    hinted = client.post(f"{url}/hint", json={"kind": "safe"}).json()

    assert _game(marked, 3)["cells"][3] == {"kind": "marked", "wrong": False}
    assert _game(stamped, 3)["cells"][5] == {"kind": "given", "value": 2, "stamped": True}
    assert hinted["hint"]["kind"] == "wrong_mark"
    assert _game(hinted["daily"], 3)["hints"] == 1
    assert hinted["daily"]["hintsAvailable"] == ["open", "camera"]


def test_open_answers_with_its_outcome(client: TestClient) -> None:
    _start(client, 1)
    url = f"{DAY}/levels/1/open"

    opened = client.post(url, json={"cell": TEST_CAMERAS[0]}).json()

    assert opened["outcome"] == "marked"
    assert _game(opened["daily"], 1)["cells"][TEST_CAMERAS[0]] == {"kind": "marked", "wrong": False}
    assert opened["daily"]["hintsAvailable"] == ["camera", "safe"]


def test_a_second_hint_of_a_kind_in_a_day_is_refused(client: TestClient) -> None:
    _start(client, 1)
    url = f"{DAY}/levels/1/hint"
    assert client.post(url, json={"kind": "camera"}).status_code == 200

    refused = client.post(url, json={"kind": "camera"})

    assert refused.status_code == 409
    assert "Camera hint" in refused.json()["detail"]
    assert client.get(DAY).json()["hintsAvailable"] == ["open", "safe"]


def test_a_hint_must_name_its_kind(client: TestClient) -> None:
    _start(client, 1)

    assert client.post(f"{DAY}/levels/1/hint", json={"kind": "open"}).status_code == 422
    assert client.post(f"{DAY}/levels/1/hint").status_code == 422


def test_each_browser_has_its_own_day(client: TestClient) -> None:
    _start(client, 1)
    for camera in TEST_CAMERAS:
        client.post(f"{DAY}/levels/1/clear", json={"cell": camera})

    stranger = TestClient(app).get(DAY).json()

    assert stranger["outcome"] == "playing"


def test_reset_does_not_exist_outside_dev_mode(client: TestClient) -> None:
    assert client.delete(DAY).status_code == 404


def test_reset_in_dev_mode_lifts_the_lock_out(client: TestClient, settings: Settings) -> None:
    _start(client, 1)
    for camera in TEST_CAMERAS:
        client.post(f"{DAY}/levels/1/clear", json={"cell": camera})
    dev = settings.model_copy(update={"dev_mode": True})
    app.dependency_overrides[get_settings] = lambda: dev

    response = client.delete(DAY)

    assert response.status_code == 200
    assert response.json()["outcome"] == "playing"
    assert [lv["state"] for lv in response.json()["levels"]] == [
        "open",
        "locked",
        "locked",
        "locked",
    ]
