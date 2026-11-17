"""Seeded randomness for puzzle generation.

This is mulberry32 with the same 32-bit arithmetic as the original JavaScript engine, so a record
number always produces the same board, in either implementation.
"""

from collections.abc import Callable, Sequence

type Random = Callable[[], float]

_MASK = 0xFFFFFFFF


def _imul(a: int, b: int) -> int:
    return (a * b) & _MASK


def make_rng(seed: int) -> Random:
    """A deterministic source of floats in [0, 1) for `seed`."""
    state = seed & _MASK

    def rand() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & _MASK
        t = _imul(state ^ (state >> 15), 1 | state)
        t = ((t + _imul(t ^ (t >> 7), 61 | t)) & _MASK) ^ t
        return ((t ^ (t >> 14)) & _MASK) / 4294967296

    return rand


def shuffled[T](items: Sequence[T], rand: Random) -> list[T]:
    """Fisher-Yates shuffle of `items` into a new list, drawing from `rand` like the JS engine."""
    out = list(items)
    for i in range(len(out) - 1, 0, -1):
        j = int(rand() * (i + 1))
        out[i], out[j] = out[j], out[i]
    return out


def pick[T](items: Sequence[T], rand: Random) -> T:
    """One item of a non-empty sequence."""
    return items[int(rand() * len(items))]
