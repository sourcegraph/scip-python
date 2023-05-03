# < definition scip-python python snapshot-util 0.1 walrus/__init__:
#documentation (module) walrus

import re
#      ^^ reference  python-stdlib 3.11 re/__init__:

some_list = [1, 2, 3, 4, 5, 100, 1000]
#^^^^^^^^ definition  snapshot-util 0.1 walrus/some_list.
#documentation ```python
#            > builtins.list
#            > ```
pattern = "^[A-Za-z0-9_]*$"
#^^^^^^ definition  snapshot-util 0.1 walrus/pattern.
#documentation ```python
#            > builtins.str
#            > ```
text = "Some_name123"
#^^^ definition  snapshot-util 0.1 walrus/text.
#documentation ```python
#            > builtins.str
#            > ```

# if statement
if (n := len(some_list)) > 10:
#   ^ definition  snapshot-util 0.1 walrus/n.
#        ^^^ reference local 0
#        external documentation ```python
#                    > (function) def len(
#                    >     __obj: Sized,
#                    >     /
#                    > ) -> int
#                    > ```
#            ^^^^^^^^^ reference  snapshot-util 0.1 walrus/some_list.
    print(f"List is too long with {n} elements.")
#   ^^^^^ reference  python-stdlib 3.11 builtins/print().
#   external documentation ```python
#               > (function) def print(
#               >     *values: object,
#               >     sep: str | None = " ",
#               >     end: str | None = "\n",
#               >     file: SupportsWrite[str] | None = No...
#               >     flush: Literal[False] = False
#               > ) -> None
#               > ```
#                                  ^ reference  snapshot-util 0.1 walrus/n.

if (match := re.search(pattern, text)) is not None:
#   ^^^^^ definition  snapshot-util 0.1 walrus/match.
#            ^^ reference  python-stdlib 3.11 re/__init__:
#               ^^^^^^ reference  python-stdlib 3.11 re/search().
#                      ^^^^^^^ reference  snapshot-util 0.1 walrus/pattern.
#                               ^^^^ reference  snapshot-util 0.1 walrus/text.
    print("Found match:", match.group(0))
#   ^^^^^ reference  python-stdlib 3.11 builtins/print().
#                         ^^^^^ reference  snapshot-util 0.1 walrus/match.
#                               ^^^^^ reference  python-stdlib 3.11 re/Match#group().


# comprehensions
def show_some_comprehension():
#   ^^^^^^^^^^^^^^^^^^^^^^^ definition  snapshot-util 0.1 walrus/show_some_comprehension().
#   documentation ```python
#               > def show_some_comprehension(): # -> None...
#               > ```
    [print(x, root) for x in some_list if (x % 2 == 0) and (root := x**0.5) > 5]
#    ^^^^^ reference  python-stdlib 3.11 builtins/print().
#          ^ reference local 1
#             ^^^^ reference local 2
#                       ^ definition local 1
#                       documentation ```python
#                                   > (variable) x: int
#                                   > ```
#                            ^^^^^^^^^ reference  snapshot-util 0.1 walrus/some_list.
#                                          ^ reference local 1
#                                                           ^^^^ definition local 2
#                                                                   ^ reference local 1


# while loop
while (line := input("Enter text: ")) != "quit":
#      ^^^^ definition  snapshot-util 0.1 walrus/line.
#              ^^^^^ reference local 3
#              external documentation ```python
#                          > (function) def input(
#                          >     __prompt: object = "",
#                          >     /
#                          > ) -> str
#                          > ```
    print(f"You entered: {line}")
#   ^^^^^ reference  python-stdlib 3.11 builtins/print().
#                         ^^^^ reference  snapshot-util 0.1 walrus/line.


# if + comprehension
if any((any_n := num) < 0 for num in some_list):
#  ^^^ reference local 4
#  external documentation ```python
#              > (function) def any(
#              >     __iterable: Iterable[object],
#              >     /
#              > ) -> bool
#              > ```
#       ^^^^^ definition any_n.
#                ^^^ reference local 5
#                             ^^^ definition local 5
#                             documentation ```python
#                                         > (variable) num: int
#                                         > ```
#                                    ^^^^^^^^^ reference  snapshot-util 0.1 walrus/some_list.
    print(f"Negative number found: {any_n}")
#   ^^^^^ reference  python-stdlib 3.11 builtins/print().
#                                   ^^^^^ reference any_n.

