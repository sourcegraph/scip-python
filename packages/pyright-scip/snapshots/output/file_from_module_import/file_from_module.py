# < definition scip-python pypi snapshot-util 0.1 file_from_module/__init__:
#documentation (module) file_from_module

from xyz import nested_file
#    ^^^ reference  snapshot-util 0.1 xyz/__init__:
#               ^^^^^^^^^^^ reference local 0

print(nested_file.X)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#documentation ```python
#            > (function)
#            > print(*values: object, sep: str | None = ..., end: str | None = ..., file: SupportsWrite[str] | None = ..., flush: Literal[False] = ...) -> None
#            > 
#            > print(*values: object, sep: str | None = ..., end: str | None = ..., file: _SupportsWriteAndFlush[str] | None = ..., flush: bool) -> None
#            > ```
#     ^^^^^^^^^^^ reference local 0
#                 ^ reference  snapshot-util 0.1 `xyz.nested_file`/X.

