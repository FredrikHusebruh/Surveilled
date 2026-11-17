"""Line of sight: cameras see up, down, left and right until a wall or the edge stops them."""

from collections.abc import Sequence

_DIRECTIONS = ((-1, 0), (1, 0), (0, -1), (0, 1))


def compute_sight_lines(rows: int, cols: int, walls: Sequence[bool]) -> tuple[tuple[int, ...], ...]:
    """For each cell, the cells it can see in order up, down, left, right. Walls see nothing."""
    lines: list[tuple[int, ...]] = []
    for r in range(rows):
        for c in range(cols):
            if walls[r * cols + c]:
                lines.append(())
                continue
            seen: list[int] = []
            for dr, dc in _DIRECTIONS:
                rr, cc = r + dr, c + dc
                while 0 <= rr < rows and 0 <= cc < cols and not walls[rr * cols + cc]:
                    seen.append(rr * cols + cc)
                    rr, cc = rr + dr, cc + dc
            lines.append(tuple(seen))
    return tuple(lines)
