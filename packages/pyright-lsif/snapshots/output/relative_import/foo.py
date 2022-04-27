def exported_function():
# definition  snapshot-util 0.1 foo/__init__:
#documentation (module) foo
#   ^^^^^^^^^^^^^^^^^ definition  snapshot-util 0.1 foo/exported_function().
#   documentation ```python
#               > def exported_function(): # -> Literal['function']:
#               > ```
#   documentation 
    return "function"

class MyClass:
#     ^^^^^^^ definition  snapshot-util 0.1 foo/MyClass#
#     documentation ```python
#                 > class MyClass:
#                 > ```
#     documentation This is a class and it is cool
    """This is a class and it is cool"""

    def __init__(self):
#       ^^^^^^^^ definition  snapshot-util 0.1 foo/MyClass#__init__().
#       documentation ```python
#                   > def __init__(
#                   >   self
#                   > ) -> None:
#                   > ```
#       documentation 
#                ^^^^ definition  snapshot-util 0.1 foo/MyClass#__init__().(self)
        pass

    def exported_function(self):
#       ^^^^^^^^^^^^^^^^^ definition  snapshot-util 0.1 foo/MyClass#exported_function().
#       documentation ```python
#                   > def exported_function(
#                   >   self
#                   > ): # -> Literal['exported']:
#                   > ```
#       documentation 
#                         ^^^^ definition  snapshot-util 0.1 foo/MyClass#exported_function().(self)
        return "exported"

this_class = MyClass()
#^^^^^^^^^ definition  snapshot-util 0.1 foo/this_class.
#documentation ```python
#            > foo.MyClass
#            > ```
#            ^^^^^^^ reference  snapshot-util 0.1 foo/MyClass#

