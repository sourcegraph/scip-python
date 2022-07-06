# < definition scip-python python snapshot-util 0.1 property_access/__init__:
#documentation (module) property_access

from typing import Sequence
#    ^^^^^^ reference  python-stdlib 3.10 typing/__init__:
#                  ^^^^^^^^ reference  python-stdlib 3.10 typing/Sequence#

class PropertyClass:
#     ^^^^^^^^^^^^^ definition  snapshot-util 0.1 property_access/PropertyClass#
#     documentation ```python
#                 > class PropertyClass:
#                 > ```
    def __init__(self):
#       ^^^^^^^^ definition  snapshot-util 0.1 property_access/PropertyClass#__init__().
#       documentation ```python
#                   > def __init__(
#                   >   self
#                   > ) -> None:
#                   > ```
#                ^^^^ definition  snapshot-util 0.1 property_access/PropertyClass#__init__().(self)
        pass

    @property
#    ^^^^^^^^ reference  python-stdlib 3.10 builtins/property#
#    external documentation ```python
#                > (class) property
#                > ```
    def prop_ref(self):
#       ^^^^^^^^ definition  snapshot-util 0.1 property_access/PropertyClass#prop_ref().
#       documentation ```python
#                   > @property
#                   > def prop_ref(
#                   >   self
#                   > ): # -> Literal[5]:
#                   > ```
#                ^^^^ definition  snapshot-util 0.1 property_access/PropertyClass#prop_ref().(self)
        return 5


xs = [PropertyClass()]
#^ definition  snapshot-util 0.1 property_access/xs.
#documentation ```python
#            > builtins.list
#            > ```
#     ^^^^^^^^^^^^^ reference  snapshot-util 0.1 property_access/PropertyClass#

def usage(xs: Sequence[PropertyClass]):
#   ^^^^^ definition  snapshot-util 0.1 property_access/usage().
#   documentation ```python
#               > def usage(
#               >   xs: Sequence[PropertyClass]
#               > ): # -> None:
#               > ```
#         ^^ definition  snapshot-util 0.1 property_access/usage().(xs)
#             ^^^^^^^^ reference  python-stdlib 3.10 typing/Sequence#
#                      ^^^^^^^^^^^^^ reference  snapshot-util 0.1 property_access/PropertyClass#
    def nested():
#       ^^^^^^ definition  snapshot-util 0.1 property_access/usage().nested().
#       documentation ```python
#                   > def nested(): # -> None:
#                   > ```
        for x in xs:
#           ^ definition local 0
#                ^^ reference  snapshot-util 0.1 property_access/usage().(xs)
            print(x.prop_ref)
#           ^^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#           external documentation ```python
#                       > (function)
#                       > print(*values: object, sep: str | None =...
#                       > 
#                       > print(*values: object, sep: str | None =...
#                       > ```
#                 ^ reference local 0
#                   ^^^^^^^^ reference  snapshot-util 0.1 property_access/PropertyClass#prop_ref().

