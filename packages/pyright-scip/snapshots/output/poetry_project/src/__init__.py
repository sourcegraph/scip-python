# < definition scip-python pypi snapshot-util 0.1 src/__init__:
#documentation (module) src

import leftpad
#      ^^^^^^^ reference  leftpad 0.1.2 leftpad/__init__:
#      ^^^^^^^ reference  leftpad 0.1.2 leftpad/__init__:

print(leftpad)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#documentation ```python
#            > (function)
#            > print(*values: object, sep: str | None = ..., end: str | None = ..., file: SupportsWrite[str] | None = ..., flush: Literal[False] = ...) -> None
#            > 
#            > print(*values: object, sep: str | None = ..., end: str | None = ..., file: _SupportsWriteAndFlush[str] | None = ..., flush: bool) -> None
#            > ```
#     ^^^^^^^ reference  leftpad 0.1.2 leftpad/__init__:

