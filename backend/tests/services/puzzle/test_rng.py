from typing import Any

import pytest

from app.services.puzzle.rng import make_rng, pick, shuffled


@pytest.mark.parametrize("seed", ["0", "4127", "4294967295"])
def test_make_rng_matches_the_js_engine(js_engine: dict[str, Any], seed: str) -> None:
    rand = make_rng(int(seed))
    assert [rand() for _ in range(5)] == js_engine["rng"][seed]


def test_make_rng_is_deterministic_and_in_unit_interval() -> None:
    first, second = make_rng(99), make_rng(99)
    values = [first() for _ in range(1000)]
    assert values == [second() for _ in range(1000)]
    assert all(0 <= v < 1 for v in values)


def test_shuffled_returns_a_new_permutation_without_touching_the_input() -> None:
    items = list(range(20))
    result = shuffled(items, make_rng(7))
    assert items == list(range(20))
    assert sorted(result) == items
    assert result != items


def test_pick_draws_from_the_sequence() -> None:
    rand = make_rng(3)
    assert {pick("abc", rand) for _ in range(50)} == {"a", "b", "c"}
