# < definition scip-python python scip-final-repro 0.1.0 contracts/__init__:
#documentation (module) contracts

# format-options: showDocs,showRanges

from __future__ import annotations
#    ^^^^^^^^^^ reference  python-stdlib 3.11 __future__/__init__:
#    external documentation ```python
#                > (module) __future__
#                > ```
#    external documentation ---
#                > 
#    external documentation Record of phased-in incompatible languag...
#                > 
#                > Each line is of the form:
#                > 
#                > &nbsp;&nbsp;&nbsp;&nbsp;FeatureName = "\...
#                > &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbs...
#                > 
#                > where, normally, OptionalRelease &lt; Ma...
#                > of the same form as sys.version\_info:
#                > 
#                > &nbsp;&nbsp;&nbsp;&nbsp;(PY\_MAJOR\_VERS...
#                > &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;PY\_MINOR\...
#                > PY\_MICRO\_VERSION, # the 0; an int
#                > PY\_RELEASE\_LEVEL, # "alpha", "beta", "...
#                > PY\_RELEASE\_SERIAL # the 3; an int  
#                > &nbsp;&nbsp;&nbsp;&nbsp;)
#                > 
#                > OptionalRelease records the first releas...
#                > 
#                > &nbsp;&nbsp;&nbsp;&nbsp;from \_\_future\...
#                > 
#                > was accepted.
#                > 
#                > In the case of MandatoryReleases that ha...
#                > MandatoryRelease predicts the release in...
#                > of the language.
#                > 
#                > Else MandatoryRelease records when the f...
#                > in releases at or after that, modules no...
#                > 
#                > &nbsp;&nbsp;&nbsp;&nbsp;from \_\_future\...
#                > 
#                > to use the feature in question, but may ...
#                > 
#                > MandatoryRelease may also be None, meani...
#                > dropped.
#                > 
#                > Instances of class \_Feature have two co...
#                > .getOptionalRelease() and .getMandatoryR...
#                > 
#                > CompilerFlag is the (bitfield) flag that...
#                > argument to the builtin function compile...
#                > dynamically compiled code.  This flag is...
#                > attribute on \_Future instances.  These ...
#                > #defines of CO\_xxx flags in Include/cpy...
#                > 
#                > No feature line is ever to be deleted fr...
#                      ^^^^^^^^^^^ reference  python-stdlib 3.11 __future__/annotations.annotations.
#                      external documentation ```python
#                                  > (variable) annotations: _Feature
#                                  > ```

from dataclasses import dataclass
#    ^^^^^^^^^^^ reference  python-stdlib 3.11 dataclasses/__init__:
#    external documentation ```python
#                > (module) dataclasses
#                > ```
#                       ^^^^^^^^^ reference  python-stdlib 3.11 dataclasses/dataclass().
from numbers import Real
#    ^^^^^^^ reference  python-stdlib 3.11 numbers/__init__:
#    external documentation ```python
#                > (module) numbers
#                > ```
#    external documentation ---
#                > 
#    external documentation Abstract Base Classes (ABCs) for numbers...
#                > 
#                > TODO: Fill out more detailed documentati...
#                   ^^^^ reference  python-stdlib 3.11 numbers/Real#
import math
#      ^^^^ reference  python-stdlib 3.11 math/__init__:


# < start enclosing_range scip-python python scip-final-repro 0.1.0 contracts/_validate().
def _validate(value: object) -> None:
#   ^^^^^^^^^ definition  scip-final-repro 0.1.0 contracts/_validate().
#   documentation ```python
#               > def _validate(
#               >   value: object
#               > ) -> None:
#               > ```
#             ^^^^^ definition  scip-final-repro 0.1.0 contracts/_validate().(value)
#                    ^^^^^^ reference  python-stdlib 3.11 builtins/object#
#                    external documentation ```python
#                                > (class) object
#                                > ```
    if not isinstance(value, Foo):
#          ^^^^^^^^^^ reference local 0
#          external documentation ```python
#                      > (function) def isinstance(
#                      >     __obj: object,
#                      >     __class_or_tuple: _ClassInfo,
#                      >     /
#                      > ) -> bool
#                      > ```
#                     ^^^^^ reference  scip-final-repro 0.1.0 contracts/_validate().(value)
#                            ^^^ reference  scip-final-repro 0.1.0 contracts/Foo#
        raise ValueError("must be Foo")
#             ^^^^^^^^^^ reference  python-stdlib 3.11 builtins/ValueError#
#             external documentation ```python
#                         > class ValueError(*args: object)
#                         > ```
    if not isinstance(value.x, Real) or not math.isfinite(value.x):
#          ^^^^^^^^^^ reference local 1
#          external documentation ```python
#                      > (function) def isinstance(
#                      >     __obj: object,
#                      >     __class_or_tuple: _ClassInfo,
#                      >     /
#                      > ) -> bool
#                      > ```
#                     ^^^^^ reference  scip-final-repro 0.1.0 contracts/_validate().(value)
#                           ^ reference  scip-final-repro 0.1.0 contracts/Foo#x.
#                              ^^^^ reference  python-stdlib 3.11 numbers/Real#
#                                           ^^^^ reference  python-stdlib 3.11 math/__init__:
#                                                ^^^^^^^^ reference  python-stdlib 3.11 math/isfinite().
#                                                         ^^^^^ reference  scip-final-repro 0.1.0 contracts/_validate().(value)
#                                                               ^ reference  scip-final-repro 0.1.0 contracts/Foo#x.
        raise ValueError("x must be finite real")
#             ^^^^^^^^^^ reference  python-stdlib 3.11 builtins/ValueError#
# < end enclosing_range scip-python python scip-final-repro 0.1.0 contracts/_validate().


# < start enclosing_range scip-python python scip-final-repro 0.1.0 contracts/Foo#
@dataclass(frozen=True)
#^^^^^^^^^ reference  python-stdlib 3.11 dataclasses/dataclass().
#          ^^^^^^ reference  python-stdlib 3.11 dataclasses/dataclass().(frozen)
#          external documentation ```python
#                      > (parameter) frozen: bool
#                      > ```
class Foo:
#     ^^^ definition  scip-final-repro 0.1.0 contracts/Foo#
#     documentation ```python
#                 > @dataclass(frozen=True)
#                 > class Foo:
#                 > ```
    x: float
#   ^ definition  scip-final-repro 0.1.0 contracts/Foo#x.
#   documentation ```python
#               > (variable) x: float
#               > ```
#      ^^^^^ reference  python-stdlib 3.11 builtins/float#
#      external documentation ```python
#                  > (class) float
#                  > ```

#   ⌄ start enclosing_range scip-python python scip-final-repro 0.1.0 contracts/Foo#__post_init__().
    def __post_init__(self) -> None:
#       ^^^^^^^^^^^^^ definition  scip-final-repro 0.1.0 contracts/Foo#__post_init__().
#       documentation ```python
#                   > def __post_init__(
#                   >   self
#                   > ) -> None:
#                   > ```
#                     ^^^^ definition  scip-final-repro 0.1.0 contracts/Foo#__post_init__().(self)
        _validate(self)
#       ^^^^^^^^^ reference  scip-final-repro 0.1.0 contracts/_validate().
#                 ^^^^ reference  scip-final-repro 0.1.0 contracts/Foo#__post_init__().(self)
#   ^ end enclosing_range scip-python python scip-final-repro 0.1.0 contracts/Foo#__post_init__().
# < end enclosing_range scip-python python scip-final-repro 0.1.0 contracts/Foo#

