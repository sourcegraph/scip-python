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
#documentation 
#     ^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/SuchNestedMuchWow#
#                         ^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/SuchNestedMuchWow#class_item.
print(InitClass().init_item)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#     ^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar`/InitClass#
#                 ^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar`/InitClass#init_item.

