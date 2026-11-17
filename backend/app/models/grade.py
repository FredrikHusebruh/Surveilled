"""How hard a record is, measured by the reasoning a careful player needs."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Grade:
    """Counts of solving steps by the cheapest technique that makes progress.

    `direct`: one trusted number settles its hidden cells on its own.
    `combined`: needs the total camera count or the Party lie rule on top of single numbers.
    `deep`: needs several numbers weighed together (such as comparing two cells in a stretch) or a
    hypothesis tested to a contradiction.
    """

    direct: int
    combined: int
    deep: int

    @property
    def rating(self) -> int:
        """Difficulty squares from 1 to 5. Deep steps dominate; combined steps beat direct ones."""
        if self.deep >= 3:
            return 5
        if self.deep == 2:
            return 4
        if self.deep == 1:
            return 3
        if self.combined >= 1:
            return 2
        return 1
