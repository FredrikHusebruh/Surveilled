import pytest

from app.services.standing_view import beat_percent, top_percent


@pytest.mark.parametrize(
    ("players", "ahead_of", "top", "beat"),
    [
        (100, 99, 1, 100),  # first of 100
        (100, 90, 10, 90),
        (100, 0, 100, 0),  # last
        (3, 1, 67, 50),
        (1, 0, 100, 0),  # alone so far
    ],
)
def test_top_and_beat_percentages(players: int, ahead_of: int, top: int, beat: int) -> None:
    assert top_percent(players, ahead_of) == top
    assert beat_percent(players, ahead_of) == beat
