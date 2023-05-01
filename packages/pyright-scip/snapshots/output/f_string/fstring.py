# < definition scip-python python snapshot-util 0.1 fstring/__init__:
#documentation (module) fstring

var = ", world!"
#^^ definition  snapshot-util 0.1 fstring/var.
#documentation ```python
#            > builtins.str
#            > ```

print(f"var: hello {var}")
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
#                   ^^^ reference  snapshot-util 0.1 fstring/var.

