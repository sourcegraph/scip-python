# < definition scip-python python snapshot-util 0.1 `src.foo.bar.baz.mod`/__init__:

class SuchNestedMuchWow:
#     ^^^^^^^^^^^^^^^^^ definition  snapshot-util 0.1 `src.foo.bar.baz.mod`/SuchNestedMuchWow#
#     ^^^^^^^^^^^^^^^^^ definition  snapshot-util 0.1 `src.foo.bar.baz.mod`/SuchNestedMuchWow#
    class_item: int = 42
#   ^^^^^^^^^^ definition  snapshot-util 0.1 `src.foo.bar.baz.mod`/SuchNestedMuchWow#class_item.
#               ^^^ reference  python-stdlib 3.11 builtins/int#

class AnotherNestedMuchWow:
#     ^^^^^^^^^^^^^^^^^^^^ definition  snapshot-util 0.1 `src.foo.bar.baz.mod`/AnotherNestedMuchWow#
#     ^^^^^^^^^^^^^^^^^^^^ definition  snapshot-util 0.1 `src.foo.bar.baz.mod`/AnotherNestedMuchWow#
    other_item: int = 42
#   ^^^^^^^^^^ definition  snapshot-util 0.1 `src.foo.bar.baz.mod`/AnotherNestedMuchWow#other_item.
#               ^^^ reference  python-stdlib 3.11 builtins/int#

