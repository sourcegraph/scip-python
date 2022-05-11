# < definition scip-python pypi snapshot-util 0.1 __main__/__init__:
#documentation (module) __main__


if __name__ == '__main__':
#  ^^^^^^^^ reference local 0
    print("main")
#   ^^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#   documentation ```python
#               > (function)
#               > print(*values: object, sep: str | None = ..., end: str | None = ..., file: SupportsWrite[str] | None = ..., flush: Literal[False] = ...) -> None
#               > 
#               > print(*values: object, sep: str | None = ..., end: str | None = ..., file: _SupportsWriteAndFlush[str] | None = ..., flush: bool) -> None
#               > ```


