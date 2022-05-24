# < definition scip-python pypi snapshot-util 0.1 `src.importer`/__init__:
#documentation (module) src.importer

from foo.bar import InitClass
#    ^^^^^^^ reference  snapshot-util 0.1 `foo.bar`/__init__:
#                   ^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar`/InitClass#
#                   documentation ```python
#                               > (class) InitClass
#                               > ```
from foo.bar.baz.mod import SuchNestedMuchWow
#    ^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `foo.bar.baz.mod`/__init__:
#                           ^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/SuchNestedMuchWow#
#                           documentation ```python
#                                       > (class) SuchNestedMuchWow
#                                       > ```

print(SuchNestedMuchWow().class_item)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#documentation ```python
#            > (function)
#            > print(*values: object, sep: str | None = ..., end: str | None = ..., file: SupportsWrite[str] | None = ..., flush: Literal[False] = ...) -> None
#            > 
#            > print(*values: object, sep: str | None = ..., end: str | None = ..., file: _SupportsWriteAndFlush[str] | None = ..., flush: bool) -> None
#            > ```
#     ^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/SuchNestedMuchWow#
#                         ^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/SuchNestedMuchWow#class_item.
print(InitClass().init_item)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#     ^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar`/InitClass#
#                 ^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar`/InitClass#init_item.

