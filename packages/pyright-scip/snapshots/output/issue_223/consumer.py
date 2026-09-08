# < definition scip-python python scip-final-repro 0.1.0 consumer/__init__:

from __future__ import annotations
#    ^^^^^^^^^^ reference  python-stdlib 3.11 __future__/__init__:
#                      ^^^^^^^^^^^ reference  python-stdlib 3.11 __future__/annotations.annotations.

from contracts import Foo
#    ^^^^^^^^^ reference  scip-final-repro 0.1.0 contracts/__init__:
#                     ^^^ reference  scip-final-repro 0.1.0 contracts/Foo#


def make_foo(x: float) -> Foo:
#   ^^^^^^^^ definition  scip-final-repro 0.1.0 consumer/make_foo().
#            ^ definition  scip-final-repro 0.1.0 consumer/make_foo().(x)
#               ^^^^^ reference  python-stdlib 3.11 builtins/float#
#                         ^^^ reference  scip-final-repro 0.1.0 contracts/Foo#
    return Foo(x=x)
#          ^^^ reference  scip-final-repro 0.1.0 contracts/Foo#
#              ^ reference  scip-final-repro 0.1.0 contracts/Foo#x.
#                ^ reference  scip-final-repro 0.1.0 consumer/make_foo().(x)

