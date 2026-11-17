from app.services.puzzle.sight import compute_sight_lines


def test_sight_runs_up_down_left_right_to_the_edges() -> None:
    lines = compute_sight_lines(3, 3, [False] * 9)
    # Centre cell 4: up 1, down 7, left 3, right 5.
    assert lines[4] == (1, 7, 3, 5)
    # Corner cell 0: down 3, 6, then right 1, 2.
    assert lines[0] == (3, 6, 1, 2)


def test_walls_block_sight_and_see_nothing() -> None:
    walls = [False, True, False]
    lines = compute_sight_lines(1, 3, walls)
    assert lines == ((), (), ())


def test_sight_is_symmetric() -> None:
    walls = [False, True, False, False, False, False, True, False, False, False, False, False]
    lines = compute_sight_lines(3, 4, walls)
    for cell, seen in enumerate(lines):
        for other in seen:
            assert cell in lines[other]
