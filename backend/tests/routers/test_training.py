from typing import Any

from fastapi.testclient import TestClient

from app.services.training_records import training_record

TRAINING = "/api/training"


def _start(client: TestClient, level: int) -> dict[str, Any]:
    response = client.post(f"{TRAINING}/{level}/start")
    assert response.status_code == 200, response.text
    return response.json()


def _camera(level: int) -> int:
    board = training_record(level).puzzle.board
    return next(cell for cell in range(board.size) if board.cameras[cell])


def test_start_returns_the_game_and_its_guided_moves_with_cameras_hidden(
    client: TestClient,
) -> None:
    training = _start(client, 1)

    assert training["level"] == 1
    assert training["guides"] == [
        {"cell": guide.cell, "action": guide.action.value} for guide in training_record(1).guides
    ]
    kinds = {cell["kind"] for cell in training["game"]["cells"]}
    assert kinds <= {"hidden", "given", "wall"}
    assert training["game"]["status"] == "play"


def test_clearing_a_camera_in_training_is_a_strike(client: TestClient) -> None:
    _start(client, 1)

    response = client.post(f"{TRAINING}/1/clear", json={"cell": _camera(1)})

    assert response.status_code == 200
    assert response.json()["outcome"] == "seen"
    assert response.json()["training"]["game"]["strikes"] == 1


def test_marking_and_hints_answer_with_the_training(client: TestClient) -> None:
    _start(client, 2)

    marked = client.post(f"{TRAINING}/2/mark", json={"cell": _camera(2)}).json()
    hinted = client.post(f"{TRAINING}/2/hint", json={"kind": "camera"}).json()

    assert marked["game"]["cells"][_camera(2)] == {"kind": "marked", "wrong": False}
    assert hinted["hint"]["kind"] in {"clue", "deduction"}


def test_stamping_a_party_record_in_training(client: TestClient) -> None:
    training = _start(client, 3)
    guide = training["guides"][0]

    stamped = client.post(f"{TRAINING}/3/stamp", json={"cell": guide["cell"]}).json()

    assert stamped["game"]["cells"][guide["cell"]]["stamped"] is True


def test_a_move_before_starting_is_a_conflict(client: TestClient) -> None:
    response = client.post(f"{TRAINING}/4/mark", json={"cell": 0})

    assert response.status_code == 409


def test_an_unknown_training_level_is_not_found(client: TestClient) -> None:
    assert client.post(f"{TRAINING}/7/start").status_code == 404


def test_open_in_training(client: TestClient) -> None:
    _start(client, 2)

    opened = client.post(f"{TRAINING}/2/open", json={"cell": _camera(2)}).json()

    assert opened["outcome"] == "marked"
    assert opened["training"]["game"]["strikes"] == 0
