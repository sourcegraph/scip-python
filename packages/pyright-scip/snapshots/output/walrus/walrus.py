# < definition scip-python python snapshot-util 0.1 walrus/__init__:
#documentation (module) walrus

import pathlib
#      ^^^^^^^ reference  python-stdlib 3.10 pathlib/__init__:

numbers = [2, 8, 0, 1, 1, 9, 7, 7]
#^^^^^^ definition  snapshot-util 0.1 walrus/numbers.
#documentation ```python
#            > builtins.list
#            > ```

description = {
#^^^^^^^^^^ definition  snapshot-util 0.1 walrus/description.
#documentation ```python
#            > builtins.dict
#            > ```
    "length": (num_length := len(numbers)),
#              ^^^^^^^^^^ definition  snapshot-util 0.1 walrus/num_length.
#                            ^^^ reference local 0
#                            external documentation ```python
#                                        > (function) len: (__obj: Sized, /) -> int
#                                        > ```
#                                ^^^^^^^ reference  snapshot-util 0.1 walrus/numbers.
    "sum": (num_sum := sum(numbers)),
#           ^^^^^^^ definition  snapshot-util 0.1 walrus/num_sum.
#                      ^^^ reference  python-stdlib 3.10 builtins/__init__:sum().
#                      external documentation ```python
#                                  > (function)
#                                  > sum(__iterable: Iterable[_LiteralInteger...
#                                  > 
#                                  > sum(__iterable: Iterable[_SupportsSumNoD...
#                                  > 
#                                  > sum(__iterable: Iterable[_AddableT1@sum]...
#                                  > ```
#                          ^^^^^^^ reference  snapshot-util 0.1 walrus/numbers.
    "mean": num_sum / num_length,
#           ^^^^^^^ reference  snapshot-util 0.1 walrus/num_sum.
#                     ^^^^^^^^^^ reference  snapshot-util 0.1 walrus/num_length.
}

print(num_length)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#external documentation ```python
#            > (function)
#            > print(*values: object, sep: str | None =...
#            > 
#            > print(*values: object, sep: str | None =...
#            > ```
#     ^^^^^^^^^^ reference  snapshot-util 0.1 walrus/num_length.

def inside_function():
#   ^^^^^^^^^^^^^^^ definition  snapshot-util 0.1 walrus/inside_function().
#   documentation ```python
#               > def inside_function(): # -> None:
#               > ```
    inner = [2, 8, 0, 1, 1, 9, 7, 7]
#   ^^^^^ definition local 1
#   documentation ```python
#               > builtins.list
#               > ```
    inner_desc = {
#   ^^^^^^^^^^ definition local 2
#   documentation ```python
#               > builtins.dict
#               > ```
        "length": (num_length := len(inner)),
#                  ^^^^^^^^^^ definition local 3
#                                ^^^ reference local 4
#                                external documentation ```python
#                                            > (function) len: (__obj: Sized, /) -> int
#                                            > ```
#                                    ^^^^^ reference local 1
        "sum": (num_sum := sum(inner)),
#               ^^^^^^^ definition local 5
#                          ^^^ reference  python-stdlib 3.10 builtins/__init__:sum().
#                              ^^^^^ reference local 1
        "mean": num_sum / num_length,
#               ^^^^^^^ reference local 5
#                         ^^^^^^^^^^ reference local 3
    }

