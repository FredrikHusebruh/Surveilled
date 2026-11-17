"""The four daily levels, easiest first.

Each day every level draws a board at random from its ranges and keeps drawing until the record's
grade lands in the level's band. The bands don't overlap, so the day always gets harder:
  I    direct reading only
  II   at least one step needs the camera total, never a deep step
  III  Party lies, exactly one deep step and at least one combined step
  IV   two or three deep steps: the final record
See app/models/grade.py for what direct, combined and deep mean.
Ranges and bands were tuned by sampling (about 82%, 12%, 55% and 80% of draws land in band).
"""

from app.models.level import GradeBand, IntRange, Level
from app.services.errors import UnknownLevelError

LEVELS: tuple[Level, ...] = (
    Level(
        id=1,
        name="Open floor",
        brief="Open floor. Few walls, so a number counts most of its row and its column.",
        sizes=((5, 5),),
        walls=IntRange(0, 2),
        cameras=IntRange(4, 6),
        lies=False,
        min_clues_per_row=2,
        max_hard_rounds=0,
        band=GradeBand(direct=IntRange(3, 6), combined=IntRange(0, 0), deep=IntRange(0, 0)),
    ),
    Level(
        id=2,
        name="Corridors",
        brief="Corridors. Walls block the view. When no number helps, count the cameras left.",
        sizes=((6, 6),),
        walls=IntRange(5, 9),
        cameras=IntRange(6, 8),
        lies=False,
        min_clues_per_row=2,
        max_hard_rounds=0,
        band=GradeBand(direct=IntRange(0, 99), combined=IntRange(1, 3), deep=IntRange(0, 0)),
    ),
    Level(
        id=3,
        name="Party records",
        brief="Party records. Red numbers come from the Party, and one in every row is false.",
        sizes=((7, 6), (6, 6)),
        walls=IntRange(5, 8),
        cameras=IntRange(7, 9),
        lies=True,
        min_clues_per_row=2,
        max_hard_rounds=1,
        band=GradeBand(direct=IntRange(0, 99), combined=IntRange(1, 99), deep=IntRange(1, 1)),
    ),
    Level(
        id=4,
        name="Ministry of Truth",
        brief="Ministry of Truth. File this record and the Ministry falls.",
        sizes=((8, 7), (7, 7)),
        walls=IntRange(9, 12),
        cameras=IntRange(11, 13),
        lies=True,
        min_clues_per_row=1,
        max_hard_rounds=3,
        band=GradeBand(direct=IntRange(0, 10), combined=IntRange(0, 99), deep=IntRange(2, 3)),
    ),
)


def get_level(level_id: int) -> Level:
    """The level with `level_id`. Raises UnknownLevelError instead of falling back."""
    for level in LEVELS:
        if level.id == level_id:
            return level
    raise UnknownLevelError(level_id)
