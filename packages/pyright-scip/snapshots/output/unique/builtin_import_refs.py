# < definition scip-python python snapshot-util 0.1 builtin_import_refs/__init__:
#documentation (module) builtin_import_refs

from typing import Any
#    ^^^^^^ reference  python-stdlib 3.10 typing/__init__:
#    external documentation ```python
#                > (module) typing
#                > ```
#                  ^^^ reference  python-stdlib 3.10 typing/Any.
#                  external documentation ```python
#                              > (variable) Any: Any
#                              > ```

print(Any)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#external documentation ```python
#            > (function)
#            > print(*values: object, sep: str | None =...
#            > 
#            > print(*values: object, sep: str | None =...
#            > ```
#     ^^^ reference  python-stdlib 3.10 typing/Any.

