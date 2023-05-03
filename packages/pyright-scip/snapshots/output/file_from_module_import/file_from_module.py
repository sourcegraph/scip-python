# < definition scip-python python snapshot-util 0.1 file_from_module/__init__:
#documentation (module) file_from_module

from xyz import nested_file
#    ^^^ reference  snapshot-util 0.1 xyz/__init__:
#               ^^^^^^^^^^^ reference  snapshot-util 0.1 `xyz.nested_file`/__init__:

print(nested_file.X)
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
#     ^^^^^^^^^^^ reference  snapshot-util 0.1 `xyz.nested_file`/__init__:
#                 ^ reference  snapshot-util 0.1 `xyz.nested_file`/X.

