"""Generation parameters for one board."""

from dataclasses import dataclass


@dataclass(frozen=True)
class BoardSpec:
    """Everything the generator needs besides a seed.

    `starting_clues` applies only without lies; lie boards deal two clues per row instead and keep
    at least `min_clues_per_row` of them while pruning. `max_hard_rounds` caps how many steps may
    need search; the generator adds clues until the record fits under it.
    """

    rows: int
    cols: int
    walls: int
    cameras: int
    lies: bool
    starting_clues: int
    min_clues_per_row: int
    max_hard_rounds: int
