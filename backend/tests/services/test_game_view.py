from app.models.game import GameStatus
from app.models.hint import ClueHint, DeductionHint, NoHint, WrongMarkHint
from app.models.puzzle import Clue
from app.schemas.games import (
    ClueHintView,
    DeductionHintView,
    ExposedCell,
    GivenCell,
    HiddenCell,
    MarkedCell,
    NoHintView,
    ObservationCell,
    RevealedCell,
    WallCell,
    WrongMarkHintView,
)
from app.services.game_view import build_game_view, build_hint_view
from tests.factories import START_TIME, make_game, make_puzzle

# Cells 0, 2 and 5 are cameras and 1 is a wall.
# Cell 3 sees 0, 4 and 5 (count 2); cell 4 sees 3 and 5 (count 1).
LAYOUT = ["C#C", "..C"]


def test_open_record_hides_cameras_and_true_counts() -> None:
    game = make_game(make_puzzle(LAYOUT, clues=[4]), marks=frozenset({3}))

    view = build_game_view(game, START_TIME)

    assert view.cells == [
        HiddenCell(),
        WallCell(),
        HiddenCell(),
        MarkedCell(wrong=False),
        GivenCell(value=1, stamped=False),
        HiddenCell(),
    ]
    assert "camera" not in view.model_dump_json(by_alias=True).replace("cameraCount", "")


def test_closed_record_reveals_cameras_and_wrong_marks() -> None:
    game = make_game(
        make_puzzle(LAYOUT, clues=[Clue(4, 2, liar=True)], lies=True),
        exposed=frozenset({0}),
        marks=frozenset({3}),
        stamps=frozenset({4}),
        status=GameStatus.LOST,
        finished_at=START_TIME + 5,
    )

    view = build_game_view(game, START_TIME + 60)

    assert view.cells == [
        ExposedCell(),
        WallCell(),
        RevealedCell(),
        MarkedCell(wrong=True),
        GivenCell(value=2, stamped=True),
        RevealedCell(),
    ]
    assert view.elapsed_seconds == 5
    assert view.strikes == 1


def test_view_carries_board_facts_and_observations() -> None:
    game = make_game(make_puzzle(LAYOUT), cleared=frozenset({3}))

    view = build_game_view(game, START_TIME + 12.7)

    assert view.cells[3] == ObservationCell(value=2)
    assert (view.rows, view.cols, view.camera_count) == (2, 3, 3)
    assert view.sight_lines[4] == [3, 5]
    assert view.elapsed_seconds == 12


def test_hint_views_name_the_verdict() -> None:
    assert build_hint_view(WrongMarkHint(3)) == WrongMarkHintView(cell=3)
    assert build_hint_view(DeductionHint(2, is_camera=True)) == DeductionHintView(
        cell=2, verdict="camera"
    )
    assert build_hint_view(NoHint()) == NoHintView()
    assert build_hint_view(ClueHint(1, 2, False, 0, 0, 3)) == ClueHintView(
        clue_cell=1, cell=2, verdict="safe", clue_value=0, cameras_seen=0, hidden_seen=3
    )
