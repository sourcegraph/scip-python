# < definition scip-python pypi snapshot-util 0.1 actual/__init__:
#documentation (module) actual

import aliased
#      ^^^^^^^ reference  snapshot-util 0.1 aliased/__init__:
import aliased as A
#      ^^^^^^^ reference  snapshot-util 0.1 aliased/__init__:
#                 ^ reference local 0

print(A.SOME_CONSTANT)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#documentation ```python
#            > (function)
#            > print(*values: object, sep: str | None = ..., end: str | None = ..., file: SupportsWrite[str] | None = ..., flush: Literal[False] = ...) -> None
#            > 
#            > print(*values: object, sep: str | None = ..., end: str | None = ..., file: _SupportsWriteAndFlush[str] | None = ..., flush: bool) -> None
#            > ```
#     ^ reference local 0
#       ^^^^^^^^^^^^^ reference  snapshot-util 0.1 aliased/SOME_CONSTANT.

