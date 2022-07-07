# < definition scip-python python snapshot-util 0.1 builtin_imports/__init__:
#documentation (module) builtin_imports

import re
#      ^^ reference  python-stdlib 3.10 re/__init__:
from typing import Callable, Match, Optional
#    ^^^^^^ reference  python-stdlib 3.10 typing/__init__:
#    external documentation ```python
#                > (module) typing
#                > ```
#                  ^^^^^^^^ reference  python-stdlib 3.10 typing/Callable.
#                  external documentation ```python
#                              > (class) Callable
#                              > ```
#                            ^^^^^ reference  python-stdlib 3.10 typing/Match#
#                                   ^^^^^^^^ reference  python-stdlib 3.10 typing/Optional.
#                                   external documentation ```python
#                                               > (class) Optional
#                                               > ```

print(re, Callable, Match, Optional)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#external documentation ```python
#            > (function)
#            > print(*values: object, sep: str | None =...
#            > 
#            > print(*values: object, sep: str | None =...
#            > ```
#     ^^ reference  python-stdlib 3.10 re/__init__:
#         ^^^^^^^^ reference  python-stdlib 3.10 typing/Callable.
#                   ^^^^^ reference  python-stdlib 3.10 typing/Match#
#                          ^^^^^^^^ reference  python-stdlib 3.10 typing/Optional.

