# < definition scip-python pypi snapshot-util 0.1 fstring/__init__:
#documentation (module) fstring

var = ", world!"
#^^ definition  snapshot-util 0.1 fstring/var.
#documentation ```python
#            > builtins.str
#            > ```

print(f"var: hello {var}")
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#documentation ```python
#            > (function)
#            > print(*values: object, sep: str | None = ..., end: str | None = ..., file: SupportsWrite[str] | None = ..., flush: Literal[False] = ...) -> None
#            > 
#            > print(*values: object, sep: str | None = ..., end: str | None = ..., file: _SupportsWriteAndFlush[str] | None = ..., flush: bool) -> None
#            > ```
#                   ^^^ reference  snapshot-util 0.1 fstring/var.

