# < definition scip-python python snapshot-util 0.1 grandparent_impl/__init__:
#documentation (module) grandparent_impl

class A:
#     ^ definition  snapshot-util 0.1 grandparent_impl/A#
#     documentation ```python
#                 > class A:
#                 > ```
    def grandparent(self) -> bool:
#       ^^^^^^^^^^^ definition  snapshot-util 0.1 grandparent_impl/A#grandparent().
#       documentation ```python
#                   > def grandparent(
#                   >   self
#                   > ) -> bool:
#                   > ```
#                   ^^^^ definition  snapshot-util 0.1 grandparent_impl/A#grandparent().(self)
#                            ^^^^ reference  python-stdlib 3.10 builtins/bool#
#                            external documentation ```python
#                                        > (class) bool
#                                        > ```
        return True

class B(A):
#     ^ definition  snapshot-util 0.1 grandparent_impl/B#
#     documentation ```python
#                 > class B(A):
#                 > ```
#     relationship implementation scip-python python snapshot-util 0.1 grandparent_impl/A#
#       ^ reference  snapshot-util 0.1 grandparent_impl/A#
    ...

class C(B):
#     ^ definition  snapshot-util 0.1 grandparent_impl/C#
#     documentation ```python
#                 > class C(B):
#                 > ```
#     relationship implementation scip-python python snapshot-util 0.1 grandparent_impl/B#
#       ^ reference  snapshot-util 0.1 grandparent_impl/B#
    def grandparent(self) -> bool:
#       ^^^^^^^^^^^ definition  snapshot-util 0.1 grandparent_impl/C#grandparent().
#       documentation ```python
#                   > def grandparent(
#                   >   self
#                   > ) -> bool:
#                   > ```
#       relationship implementation scip-python python snapshot-util 0.1 grandparent_impl/A#grandparent().
#                   ^^^^ definition  snapshot-util 0.1 grandparent_impl/C#grandparent().(self)
#                            ^^^^ reference  python-stdlib 3.10 builtins/bool#
        return False

