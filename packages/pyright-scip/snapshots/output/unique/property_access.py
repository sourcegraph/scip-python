# < definition scip-python python snapshot-util 0.1 property_access/__init__:
#documentation (module) property_access

from typing import Sequence
#    ^^^^^^ reference  python-stdlib 3.11 typing/__init__:
#    external documentation ```python
#                > (module) typing
#                > ```
#    external documentation ---
#                > 
#    external documentation The typing module: Support for gradual t...
#                > 
#                > At large scale, the structure of the mod...
#                >  * Imports and exports, all public names...
#                >  * Internal helper functions: these shou...
#                >  * \_SpecialForm and its instances (spec...
#                > Any, NoReturn, ClassVar, Union, Optional...
#                >  * Classes whose instances can be type a...
#                > ForwardRef, TypeVar and ParamSpec
#                >  * The core of internal generics API: \_...
#                > currently only used by Tuple and Callabl...
#                > etc., are instances of either of these c...
#                >  * The public counterpart of the generic...
#                >  * Public helper functions: get\_type\_h...
#                > no\_type\_check\_decorator.
#                >  * Generic aliases for collections.abc A...
#                >  * Special types: NewType, NamedTuple, T...
#                >  * Wrapper submodules for re and io rela...
#                  ^^^^^^^^ reference  python-stdlib 3.11 typing/Sequence#

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
#    ^^^^^^^^ reference  python-stdlib 3.11 builtins/property#
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
#             ^^^^^^^^ reference  python-stdlib 3.11 typing/Sequence#
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
#           ^^^^^ reference  python-stdlib 3.11 builtins/__init__:print().
#           external documentation ```python
#                       > (function) def print(
#                       >     *values: object,
#                       >     sep: str | None = " ",
#                       >     end: str | None = "\n",
#                       >     file: SupportsWrite[str] | None = No...
#                       >     flush: Literal[False] = False
#                       > ) -> None
#                       > ```
#                 ^ reference local 0
#                   ^^^^^^^^ reference  snapshot-util 0.1 property_access/PropertyClass#prop_ref().

