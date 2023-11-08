# < definition scip-python python snapshot-util 0.1 /__init__:
#documentation (module) 

class SuchNestedMuchWow:
#     ^^^^^^^^^^^^^^^^^ definition  snapshot-util 0.1 /SuchNestedMuchWow#
#     documentation ```python
#                 > class SuchNestedMuchWow:
#                 > ```
    class_item: int = 42
#   ^^^^^^^^^^ definition  snapshot-util 0.1 /SuchNestedMuchWow#class_item.
#   documentation ```python
#               > (variable) class_item: Literal[42]
#               > ```
#               ^^^ reference  python-stdlib 3.11 builtins/int#
#               external documentation ```python
#                           > (class) int
#                           > ```

class AnotherNestedMuchWow:
#     ^^^^^^^^^^^^^^^^^^^^ definition  snapshot-util 0.1 /AnotherNestedMuchWow#
#     documentation ```python
#                 > class AnotherNestedMuchWow:
#                 > ```
    other_item: int = 42
#   ^^^^^^^^^^ definition  snapshot-util 0.1 /AnotherNestedMuchWow#other_item.
#   documentation ```python
#               > (variable) other_item: Literal[42]
#               > ```
#               ^^^ reference  python-stdlib 3.11 builtins/int#

