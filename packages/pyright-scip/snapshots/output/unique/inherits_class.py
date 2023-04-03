# < definition scip-python python snapshot-util 0.1 inherits_class/__init__:
#documentation (module) inherits_class

class A:
#     ^ definition  snapshot-util 0.1 inherits_class/A#
#     documentation ```python
#                 > class A:
#                 > ```
    def x(self) -> int:
#       ^ definition  snapshot-util 0.1 inherits_class/A#x().
#       documentation ```python
#                   > def x(
#                   >   self
#                   > ) -> int:
#                   > ```
#         ^^^^ definition  snapshot-util 0.1 inherits_class/A#x().(self)
#                  ^^^ reference  python-stdlib 3.11 builtins/int#
#                  external documentation ```python
#                              > (class) int
#                              > ```
        raise NotImplemented
#             ^^^^^^^^^^^^^^ reference  python-stdlib 3.11 builtins/NotImplemented#
#             external documentation ```python
#                         > (variable) NotImplemented: _NotImplement...
#                         > ```

    def unmatched(self, x: int):
#       ^^^^^^^^^ definition  snapshot-util 0.1 inherits_class/A#unmatched().
#       documentation ```python
#                   > def unmatched(
#                   >   self,
#                   >   x: int
#                   > ): # -> None:
#                   > ```
#                 ^^^^ definition  snapshot-util 0.1 inherits_class/A#unmatched().(self)
#                       ^ definition  snapshot-util 0.1 inherits_class/A#unmatched().(x)
#                          ^^^ reference  python-stdlib 3.11 builtins/int#
        pass

class B(A):
#     ^ definition  snapshot-util 0.1 inherits_class/B#
#     documentation ```python
#                 > class B(A):
#                 > ```
#     relationship implementation scip-python python snapshot-util 0.1 inherits_class/A#
#       ^ reference  snapshot-util 0.1 inherits_class/A#
    def x(self) -> int:
#       ^ definition  snapshot-util 0.1 inherits_class/B#x().
#       documentation ```python
#                   > def x(
#                   >   self
#                   > ) -> int:
#                   > ```
#       relationship implementation scip-python python snapshot-util 0.1 inherits_class/A#x().
#         ^^^^ definition  snapshot-util 0.1 inherits_class/B#x().(self)
#                  ^^^ reference  python-stdlib 3.11 builtins/int#
        return 5

    def unmatched(self, x: int, y: int):
#       ^^^^^^^^^ definition  snapshot-util 0.1 inherits_class/B#unmatched().
#       documentation ```python
#                   > def unmatched(
#                   >   self,
#                   >   x: int,
#                   >   y: int
#                   > ): # -> None:
#                   > ```
#                 ^^^^ definition  snapshot-util 0.1 inherits_class/B#unmatched().(self)
#                       ^ definition  snapshot-util 0.1 inherits_class/B#unmatched().(x)
#                          ^^^ reference  python-stdlib 3.11 builtins/int#
#                               ^ definition  snapshot-util 0.1 inherits_class/B#unmatched().(y)
#                                  ^^^ reference  python-stdlib 3.11 builtins/int#
        pass

    def unrelated(self):
#       ^^^^^^^^^ definition  snapshot-util 0.1 inherits_class/B#unrelated().
#       documentation ```python
#                   > def unrelated(
#                   >   self
#                   > ): # -> None:
#                   > ```
#                 ^^^^ definition  snapshot-util 0.1 inherits_class/B#unrelated().(self)
        pass

