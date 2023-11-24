# < definition scip-python python snapshot-util 0.1 `src.long_importer`/__init__:
#documentation (module) src.long_importer

import foo.bar.baz.mod
#      ^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/__init__:

print(foo.bar.baz.mod.SuchNestedMuchWow)
#^^^^ reference  python-stdlib 3.11 builtins/print().
#external documentation ```python
#            > (function) def print(
#            >     *values: object,
#            >     sep: str | None = " ",
#            >     end: str | None = "\n",
#            >     file: SupportsWrite[str] | None = No...
#            >     flush: Literal[False] = False
#            > ) -> None
#            > ```
#     ^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `foo.bar.baz.mod`/__init__:
#                     ^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/SuchNestedMuchWow#

