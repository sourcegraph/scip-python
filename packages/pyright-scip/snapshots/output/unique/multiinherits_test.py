# < definition scip-python python snapshot-util 0.1 multiinherits_test/__init__:
#documentation (module) multiinherits_test

class Left:
#     ^^^^ definition  snapshot-util 0.1 multiinherits_test/Left#
#     documentation ```python
#                 > class Left:
#                 > ```
    def one(self) -> int:
#       ^^^ definition  snapshot-util 0.1 multiinherits_test/Left#one().
#       documentation ```python
#                   > def one(
#                   >   self
#                   > ) -> int:
#                   > ```
#           ^^^^ definition  snapshot-util 0.1 multiinherits_test/Left#one().(self)
#                    ^^^ reference  python-stdlib 3.10 builtins/int#
#                    external documentation ```python
#                                > (class) int
#                                > ```
        return 1

    def shared(self) -> bool:
#       ^^^^^^ definition  snapshot-util 0.1 multiinherits_test/Left#shared().
#       documentation ```python
#                   > def shared(
#                   >   self
#                   > ) -> bool:
#                   > ```
#              ^^^^ definition  snapshot-util 0.1 multiinherits_test/Left#shared().(self)
#                       ^^^^ reference  python-stdlib 3.10 builtins/bool#
#                       external documentation ```python
#                                   > (class) bool
#                                   > ```
        return False

class Right:
#     ^^^^^ definition  snapshot-util 0.1 multiinherits_test/Right#
#     documentation ```python
#                 > class Right:
#                 > ```
    def two(self):
#       ^^^ definition  snapshot-util 0.1 multiinherits_test/Right#two().
#       documentation ```python
#                   > def two(
#                   >   self
#                   > ): # -> Literal[2]:
#                   > ```
#           ^^^^ definition  snapshot-util 0.1 multiinherits_test/Right#two().(self)
        return 2

    def shared(self) -> bool:
#       ^^^^^^ definition  snapshot-util 0.1 multiinherits_test/Right#shared().
#       documentation ```python
#                   > def shared(
#                   >   self
#                   > ) -> bool:
#                   > ```
#              ^^^^ definition  snapshot-util 0.1 multiinherits_test/Right#shared().(self)
#                       ^^^^ reference  python-stdlib 3.10 builtins/bool#
        return False

class Multi(Left, Right):
#     ^^^^^ definition  snapshot-util 0.1 multiinherits_test/Multi#
#     documentation ```python
#                 > class Multi(Left, Right):
#                 > ```
#     relationship implementation scip-python python snapshot-util 0.1 multiinherits_test/Left#
#     relationship implementation scip-python python snapshot-util 0.1 multiinherits_test/Right#
#           ^^^^ reference  snapshot-util 0.1 multiinherits_test/Left#
#                 ^^^^^ reference  snapshot-util 0.1 multiinherits_test/Right#
    def one(self) -> int:
#       ^^^ definition  snapshot-util 0.1 multiinherits_test/Multi#one().
#       documentation ```python
#                   > def one(
#                   >   self
#                   > ) -> int:
#                   > ```
#       relationship implementation scip-python python snapshot-util 0.1 multiinherits_test/Left#one().
#           ^^^^ definition  snapshot-util 0.1 multiinherits_test/Multi#one().(self)
#                    ^^^ reference  python-stdlib 3.10 builtins/int#
        return 1

    def two(self):
#       ^^^ definition  snapshot-util 0.1 multiinherits_test/Multi#two().
#       documentation ```python
#                   > def two(
#                   >   self
#                   > ): # -> Literal[2]:
#                   > ```
#       relationship implementation scip-python python snapshot-util 0.1 multiinherits_test/Right#two().
#           ^^^^ definition  snapshot-util 0.1 multiinherits_test/Multi#two().(self)
        return 2

    def three(self):
#       ^^^^^ definition  snapshot-util 0.1 multiinherits_test/Multi#three().
#       documentation ```python
#                   > def three(
#                   >   self
#                   > ): # -> Literal[3]:
#                   > ```
#             ^^^^ definition  snapshot-util 0.1 multiinherits_test/Multi#three().(self)
        return 3

    def shared(self) -> bool:
#       ^^^^^^ definition  snapshot-util 0.1 multiinherits_test/Multi#shared().
#       documentation ```python
#                   > def shared(
#                   >   self
#                   > ) -> bool:
#                   > ```
#       relationship implementation scip-python python snapshot-util 0.1 multiinherits_test/Left#shared().
#       relationship implementation scip-python python snapshot-util 0.1 multiinherits_test/Right#shared().
#              ^^^^ definition  snapshot-util 0.1 multiinherits_test/Multi#shared().(self)
#                       ^^^^ reference  python-stdlib 3.10 builtins/bool#
        return True

