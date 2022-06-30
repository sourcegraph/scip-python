# < definition scip-python python snapshot-util 0.1 builtin_imports/__init__:
#documentation (module) builtin_imports

import re
from typing import Callable, Match, Optional
#    ^^^^^^ reference  python-stdlib 3.10 typing/__init__:
#                  ^^^^^^^^ reference  python-stdlib 3.10 typing/Callable.
#                            ^^^^^ reference  python-stdlib 3.10 typing/Match#
#                                   ^^^^^^^^ reference  python-stdlib 3.10 typing/Optional.

print(re, Callable, Match, Optional)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#     ^^ reference  python-stdlib 3.10 re/__init__:
#         ^^^^^^^^ reference  python-stdlib 3.10 typing/Callable.
#                   ^^^^^ reference  python-stdlib 3.10 typing/Match#
#                          ^^^^^^^^ reference  python-stdlib 3.10 typing/Optional.

