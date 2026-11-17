import pytest

from app.models.grade import Grade
from app.models.level import GradeBand, IntRange


@pytest.mark.parametrize(
    ("grade", "rating"),
    [
        (Grade(5, 0, 0), 1),
        (Grade(5, 2, 0), 2),
        (Grade(0, 0, 1), 3),
        (Grade(9, 3, 2), 4),
        (Grade(0, 0, 3), 5),
    ],
)
def test_rating_is_driven_by_the_hardest_technique(grade: Grade, rating: int) -> None:
    assert grade.rating == rating


def test_int_range_is_inclusive() -> None:
    span = IntRange(2, 4)
    assert [n in span for n in range(1, 6)] == [False, True, True, True, False]


def test_band_admits_only_grades_inside_every_range() -> None:
    band = GradeBand(direct=IntRange(0, 10), combined=IntRange(1, 3), deep=IntRange(0, 0))

    assert band.admits(Grade(4, 1, 0))
    assert not band.admits(Grade(4, 0, 0))
    assert not band.admits(Grade(4, 1, 1))
    assert not band.admits(Grade(11, 1, 0))
