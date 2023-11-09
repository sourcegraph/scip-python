# < definition scip-python python snapshot-util 0.1 advanced/__init__:
#documentation (module) advanced

def class_decorator(cls):
#   ^^^^^^^^^^^^^^^ definition <enclosing 0, 0, 3, 18> snapshot-util 0.1 advanced/class_decorator().
#   documentation ```python
#               > def class_decorator(
#               >   cls
#               > ): # -> (*args: Unknown, **kwargs: Unkno...
#               > ```
#                   ^^^ definition  snapshot-util 0.1 advanced/class_decorator().(cls)
    def wrapper(*args, **kwargs):
#       ^^^^^^^ definition <enclosing 1, 4, 2, 35> snapshot-util 0.1 advanced/class_decorator().wrapper().
#       documentation ```python
#                   > def wrapper(
#                   >   *args,
#                   >   **kwargs
#                   > ):
#                   > ```
#                ^^^^ definition  snapshot-util 0.1 advanced/class_decorator().wrapper().(args)
#                        ^^^^^^ definition  snapshot-util 0.1 advanced/class_decorator().wrapper().(kwargs)
        return cls(*args, **kwargs)
#              ^^^ reference  snapshot-util 0.1 advanced/class_decorator().(cls)
#                   ^^^^ reference  snapshot-util 0.1 advanced/class_decorator().wrapper().(args)
#                           ^^^^^^ reference  snapshot-util 0.1 advanced/class_decorator().wrapper().(kwargs)
    return wrapper
#          ^^^^^^^ reference  snapshot-util 0.1 advanced/class_decorator().wrapper().

@class_decorator
#^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 advanced/class_decorator().
class Test:
#     ^^^^ definition <enclosing 5, 0, 11, 21> snapshot-util 0.1 advanced/Test#
#     documentation ```python
#                 > @class_decorator
#                 > class Test:
#                 > ```
#     ^^^^ definition  snapshot-util 0.1 advanced/Test#
    def __init__(self, x: float):
#       ^^^^^^^^ definition <enclosing 7, 4, 8, 18> snapshot-util 0.1 advanced/Test#__init__().
#       documentation ```python
#                   > def __init__(
#                   >   self,
#                   >   x: float
#                   > ) -> None:
#                   > ```
#                ^^^^ definition  snapshot-util 0.1 advanced/Test#__init__().(self)
#                      ^ definition  snapshot-util 0.1 advanced/Test#__init__().(x)
#                         ^^^^^ reference  python-stdlib 3.11 builtins/float#
#                         external documentation ```python
#                                     > (class) float
#                                     > ```
        self.x = x
#       ^^^^ reference  snapshot-util 0.1 advanced/Test#__init__().(self)
#            ^ definition  snapshot-util 0.1 advanced/Test#x.
#            documentation ```python
#                        > (variable) x: float
#                        > ```
#                ^ reference  snapshot-util 0.1 advanced/Test#__init__().(x)

    def test(self) -> float:
#       ^^^^ definition <enclosing 10, 4, 11, 21> snapshot-util 0.1 advanced/Test#test().
#       documentation ```python
#                   > def test(
#                   >   self
#                   > ) -> float:
#                   > ```
#            ^^^^ definition  snapshot-util 0.1 advanced/Test#test().(self)
#                     ^^^^^ reference  python-stdlib 3.11 builtins/float#
        return self.x
#              ^^^^ reference  snapshot-util 0.1 advanced/Test#test().(self)
#                   ^ reference  snapshot-util 0.1 advanced/Test#x.

