# < definition scip-python python snapshot-util 0.1 advanced/__init__:
#documentation (module) advanced

def decorator(func):
#   ^^^^^^^^^ definition <enclosing 0, 0, 3, 18> snapshot-util 0.1 advanced/decorator().
#   documentation ```python
#               > def decorator(
#               >   func
#               > ): # -> (*args: Unknown, **kwargs: Unkno...
#               > ```
#             ^^^^ definition  snapshot-util 0.1 advanced/decorator().(func)
    def wrapper(*args, **kwargs):
#       ^^^^^^^ definition <enclosing 1, 4, 2, 36> snapshot-util 0.1 advanced/decorator().wrapper().
#       documentation ```python
#                   > def wrapper(
#                   >   *args,
#                   >   **kwargs
#                   > ):
#                   > ```
#                ^^^^ definition  snapshot-util 0.1 advanced/decorator().wrapper().(args)
#                        ^^^^^^ definition  snapshot-util 0.1 advanced/decorator().wrapper().(kwargs)
        return func(*args, **kwargs)
#              ^^^^ reference  snapshot-util 0.1 advanced/decorator().(func)
#                    ^^^^ reference  snapshot-util 0.1 advanced/decorator().wrapper().(args)
#                            ^^^^^^ reference  snapshot-util 0.1 advanced/decorator().wrapper().(kwargs)
    return wrapper
#          ^^^^^^^ reference  snapshot-util 0.1 advanced/decorator().wrapper().

@decorator
#^^^^^^^^^ reference  snapshot-util 0.1 advanced/decorator().
def func(x: float) -> float:
#   ^^^^ definition <enclosing 5, 0, 9, 15> snapshot-util 0.1 advanced/func().
#   documentation ```python
#               > @decorator
#               > def func(
#               >   x: float
#               > ) -> float:
#               > ```
#        ^ definition  snapshot-util 0.1 advanced/func().(x)
#           ^^^^^ reference  python-stdlib 3.11 builtins/float#
#           external documentation ```python
#                       > (class) float
#                       > ```
#                     ^^^^^ reference  python-stdlib 3.11 builtins/float#
    test = x
#   ^^^^ definition local 0
#   documentation ```python
#               > builtins.float
#               > ```
#          ^ reference  snapshot-util 0.1 advanced/func().(x)

    return test
#          ^^^^ reference local 0

