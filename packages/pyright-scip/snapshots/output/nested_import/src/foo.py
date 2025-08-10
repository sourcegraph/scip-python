# < definition scip-python python snapshot-util 0.1 `src.foo`/__init__:
#documentation (module) src.foo

from .bar.baz import baz_function
#    ^^^^^^^^ reference  snapshot-util 0.1 `src.bar.baz`/__init__:
#                    ^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.bar.baz`/baz_function().
from bar.mod import mod_function
#    ^^^^^^^ reference  snapshot-util 0.1 `src.bar.mod`/__init__:
#                   ^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.bar.mod`/mod_function().
from src.bar.toc import toc_function
#    ^^^^^^^^^^^ reference  snapshot-util 0.1 `src.bar.toc`/__init__:
#                       ^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.bar.toc`/toc_function().

baz_function()
#^^^^^^^^^^^ reference  snapshot-util 0.1 `src.bar.baz`/baz_function().
mod_function()
#^^^^^^^^^^^ reference  snapshot-util 0.1 `src.bar.mod`/mod_function().
toc_function()
#^^^^^^^^^^^ reference  snapshot-util 0.1 `src.bar.toc`/toc_function().

