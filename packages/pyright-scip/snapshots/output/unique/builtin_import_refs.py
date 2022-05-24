# < definition scip-python pypi snapshot-util 0.1 builtin_import_refs/__init__:
#documentation (module) builtin_import_refs

from typing import Any
#    ^^^^^^ reference  snapshot-util 0.1 typing/__init__:
#                  ^^^ reference  python-stdlib 3.10 typing/Any.
#                  documentation ```python
#                              > (variable) Any: Any
#                              > ```

print(Any)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#documentation ```python
#            > (function)
#            > print(*values: object, sep: str | None = ..., end: str | None = ..., file: SupportsWrite[str] | None = ..., flush: Literal[False] = ...) -> None
#            > 
#            > print(*values: object, sep: str | None = ..., end: str | None = ..., file: _SupportsWriteAndFlush[str] | None = ..., flush: bool) -> None
#            > ```
#     ^^^ reference  python-stdlib 3.10 typing/Any.

