from __future__ import annotations

from contracts import Foo


def make_foo(x: float) -> Foo:
    return Foo(x=x)
