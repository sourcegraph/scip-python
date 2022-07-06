# < definition scip-python python snapshot-util 0.1 `src.foo.bar.baz.mod`/__init__:
#documentation (module) src.foo.bar.baz.mod

class SuchNestedMuchWow:
#     ^^^^^^^^^^^^^^^^^ definition  snapshot-util 0.1 `src.foo.bar.baz.mod`/SuchNestedMuchWow#
#     documentation ```python
#                 > class SuchNestedMuchWow:
#                 > ```
    class_item: int = 42
#   ^^^^^^^^^^ definition  snapshot-util 0.1 `src.foo.bar.baz.mod`/SuchNestedMuchWow#class_item.
#   documentation ```python
#               > (variable) class_item: Literal[42]
#               > ```
#               ^^^ reference  python-stdlib 3.10 builtins/int#
#               external documentation ```python
#                           > (class) int
#                           > ```

class AnotherNestedMuchWow:
#     ^^^^^^^^^^^^^^^^^^^^ definition  snapshot-util 0.1 `src.foo.bar.baz.mod`/AnotherNestedMuchWow#
#     documentation ```python
#                 > class AnotherNestedMuchWow:
#                 > ```
    other_item: int = 42
#   ^^^^^^^^^^ definition  snapshot-util 0.1 `src.foo.bar.baz.mod`/AnotherNestedMuchWow#other_item.
#   documentation ```python
#               > (variable) other_item: Literal[42]
#               > ```
#               ^^^ reference  python-stdlib 3.10 builtins/int#

