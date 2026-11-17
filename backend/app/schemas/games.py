"""Shapes for one record on the wire: requests on a cell, the game view and hints.

A GameView only carries what the player is allowed to know: camera positions and true counts of
hidden cells stay on the server until the record closes.
"""

from typing import Annotated, Literal

from pydantic import Field

from app.models.game import GameStatus
from app.schemas.base import ApiModel

type Verdict = Literal["safe", "camera"]


class CellRequest(ApiModel):
    cell: int = Field(ge=0, description="Row-major cell index.")


class WallCell(ApiModel):
    kind: Literal["wall"] = "wall"


class HiddenCell(ApiModel):
    kind: Literal["hidden"] = "hidden"


class MarkedCell(ApiModel):
    kind: Literal["marked"] = "marked"
    wrong: bool = Field(description="True only once the record closes, for marks on safe cells.")


class ExposedCell(ApiModel):
    """A camera the player cleared by mistake."""

    kind: Literal["exposed"] = "exposed"


class RevealedCell(ApiModel):
    """An unmarked camera, shown once the record closes."""

    kind: Literal["revealed"] = "revealed"


class GivenCell(ApiModel):
    """A starting number. On boards with lies it is a Party record and may be false."""

    kind: Literal["given"] = "given"
    value: int
    stamped: bool


class ObservationCell(ApiModel):
    """A number the player uncovered. Always true."""

    kind: Literal["observation"] = "observation"
    value: int


type CellView = Annotated[
    WallCell | HiddenCell | MarkedCell | ExposedCell | RevealedCell | GivenCell | ObservationCell,
    Field(discriminator="kind"),
]


class GameView(ApiModel):
    record_no: int
    rows: int
    cols: int
    lies: bool
    camera_count: int
    rating: int = Field(ge=1, le=5)
    status: GameStatus
    strikes: int
    max_strikes: int
    hints: int
    elapsed_seconds: int
    cells: list[CellView] = Field(description="One entry per cell, row-major.")
    sight_lines: list[list[int]] = Field(description="For each cell, the cells it can see.")


class WrongMarkHintView(ApiModel):
    kind: Literal["wrong_mark"] = "wrong_mark"
    cell: int


class ClueHintView(ApiModel):
    kind: Literal["clue"] = "clue"
    clue_cell: int
    cell: int
    verdict: Verdict
    clue_value: int
    cameras_seen: int
    hidden_seen: int


class DeductionHintView(ApiModel):
    kind: Literal["deduction"] = "deduction"
    cell: int
    verdict: Verdict


class NoHintView(ApiModel):
    kind: Literal["none"] = "none"


type HintView = Annotated[
    WrongMarkHintView | ClueHintView | DeductionHintView | NoHintView,
    Field(discriminator="kind"),
]
