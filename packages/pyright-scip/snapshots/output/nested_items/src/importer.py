# < definition scip-python python snapshot-util 0.1 `src.importer`/__init__:

from foo.bar import InitClass
#    ^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar`/__init__:
#                   ^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar`/InitClass#
from foo.bar.baz.mod import SuchNestedMuchWow, AnotherNestedMuchWow
#    ^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/__init__:
#                           ^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/SuchNestedMuchWow#
#                                              ^^^^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/AnotherNestedMuchWow#

print(SuchNestedMuchWow().class_item)
#^^^^ reference  python-stdlib 3.11 builtins/print().
#     ^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/SuchNestedMuchWow#
#                         ^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/SuchNestedMuchWow#class_item.
print(AnotherNestedMuchWow().other_item)
#^^^^ reference  python-stdlib 3.11 builtins/print().
#     ^^^^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/AnotherNestedMuchWow#
#                            ^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/AnotherNestedMuchWow#other_item.
print(InitClass().init_item)
#^^^^ reference  python-stdlib 3.11 builtins/print().
#     ^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar`/InitClass#
#                 ^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar`/InitClass#init_item.

