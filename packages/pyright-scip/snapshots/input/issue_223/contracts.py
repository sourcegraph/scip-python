# format-options: showDocs,showRanges

from __future__ import annotations

from dataclasses import dataclass
from numbers import Real
import math


def _validate(value: object) -> None:
    if not isinstance(value, Foo):
        raise ValueError("must be Foo")
    if not isinstance(value.x, Real) or not math.isfinite(value.x):
        raise ValueError("x must be finite real")


@dataclass(frozen=True)
class Foo:
    x: float

    def __post_init__(self) -> None:
        _validate(self)
