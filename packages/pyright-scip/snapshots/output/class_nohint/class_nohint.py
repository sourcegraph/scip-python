# < definition scip-python pypi snapshot-util 0.1 class_nohint/__init__:
#documentation (module) class_nohint

class Example:
#     ^^^^^^^ definition  snapshot-util 0.1 class_nohint/Example#
#     documentation ```python
#                 > class Example:
#                 > ```
    # No field hint, like this
    # x: int

    def __init__(self, x, y: str):
#       ^^^^^^^^ definition  snapshot-util 0.1 class_nohint/Example#__init__().
#       documentation ```python
#                   > def __init__(
#                   >   self,
#                   >   x,
#                   >   y: str
#                   > ) -> None:
#                   > ```
#                ^^^^ definition  snapshot-util 0.1 class_nohint/Example#__init__().(self)
#                      ^ definition  snapshot-util 0.1 class_nohint/Example#__init__().(x)
#                         ^ definition  snapshot-util 0.1 class_nohint/Example#__init__().(y)
#                            ^^^ reference local 0
        self.x = x
#       ^^^^ reference  snapshot-util 0.1 class_nohint/Example#__init__().(self)
#            ^ definition local 1
#                ^ reference  snapshot-util 0.1 class_nohint/Example#__init__().(x)
        self.y = y
#       ^^^^ reference  snapshot-util 0.1 class_nohint/Example#__init__().(self)
#            ^ definition local 2
#                ^ reference  snapshot-util 0.1 class_nohint/Example#__init__().(y)

    def something(self):
#       ^^^^^^^^^ definition  snapshot-util 0.1 class_nohint/Example#something().
#       documentation ```python
#                   > def something(
#                   >   self
#                   > ): # -> None:
#                   > ```
#                 ^^^^ definition  snapshot-util 0.1 class_nohint/Example#something().(self)
        print(self.x)
#       ^^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#       documentation 
#             ^^^^ reference  snapshot-util 0.1 class_nohint/Example#something().(self)
#                  ^ reference local 1
        print(self.y)
#       ^^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#             ^^^^ reference  snapshot-util 0.1 class_nohint/Example#something().(self)
#                  ^ reference local 2

