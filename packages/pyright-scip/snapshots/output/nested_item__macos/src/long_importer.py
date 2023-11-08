# < definition scip-python python snapshot-util 0.1 `src.long_importer`/__init__:
#documentation (module) src.long_importer

import foo.bar.baz.mod
#      ^^^^^^^^^^^^^^^ reference local 0
#      documentation (module): foo.bar.baz.mod [unable to res...

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
#     ^^^ reference local 0
#                     ^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 /SuchNestedMuchWow#

