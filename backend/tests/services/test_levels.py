import itertools

import pytest

from app.models.grade import Grade
from app.services.errors import UnknownLevelError
from app.services.levels import LEVELS, get_level

# Every grade a record could plausibly get.
ALL_GRADES = [Grade(d, c, k) for d, c, k in itertools.product(range(25), range(6), range(5))]


def test_levels_are_numbered_in_play_order() -> None:
    assert [level.id for level in LEVELS] == [1, 2, 3, 4]


def test_get_level_raises_instead_of_falling_back() -> None:
    assert get_level(2).name == "Corridors"
    with pytest.raises(UnknownLevelError):
        get_level(5)


def test_no_grade_fits_two_levels() -> None:
    for grade in ALL_GRADES:
        assert sum(level.band.admits(grade) for level in LEVELS) <= 1, grade


def test_every_level_rates_strictly_harder_than_the_one_before() -> None:
    ratings = [{g.rating for g in ALL_GRADES if level.band.admits(g)} for level in LEVELS]
    for easier, harder in itertools.pairwise(ratings):
        assert max(easier) < min(harder)


def test_boards_fit_a_phone() -> None:
    # Cells must stay at least 44px on phones, which allows at most 7 columns.
    assert all(cols <= 7 for level in LEVELS for _, cols in level.sizes)
