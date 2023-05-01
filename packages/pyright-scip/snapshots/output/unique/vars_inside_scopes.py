# < definition scip-python python snapshot-util 0.1 vars_inside_scopes/__init__:
#documentation (module) vars_inside_scopes

from typing import List
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
#                > Any, NoReturn, Never, ClassVar, Union, O...
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
#                  ^^^^ reference  python-stdlib 3.11 typing/List.
#                  external documentation ```python
#                              > (variable) List: Type[List[_T@list]]
#                              > ```

class X:
#     ^ definition  snapshot-util 0.1 vars_inside_scopes/X#
#     documentation ```python
#                 > class X:
#                 > ```
    items: List[int]
#   ^^^^^ definition  snapshot-util 0.1 vars_inside_scopes/X#items.
#   documentation ```python
#               > (variable) items: List[int]
#               > ```
#          ^^^^ reference  python-stdlib 3.11 typing/List.
#               ^^^ reference  python-stdlib 3.11 builtins/int#
#               external documentation ```python
#                           > (class) int
#                           > ```

    def my_func(self):
#       ^^^^^^^ definition  snapshot-util 0.1 vars_inside_scopes/X#my_func().
#       documentation ```python
#                   > def my_func(
#                   >   self
#                   > ): # -> None:
#                   > ```
#               ^^^^ definition  snapshot-util 0.1 vars_inside_scopes/X#my_func().(self)
        for x in self.items:
#           ^ definition local 0
#                ^^^^ reference  snapshot-util 0.1 vars_inside_scopes/X#my_func().(self)
#                     ^^^^^ reference  snapshot-util 0.1 vars_inside_scopes/X#items.
            y = x + 1
#           ^ definition local 1
#           documentation ```python
#                       > builtins.int
#                       > ```
#               ^ reference local 0

        if 5 in self.items:
#               ^^^^ reference  snapshot-util 0.1 vars_inside_scopes/X#my_func().(self)
#                    ^^^^^ reference  snapshot-util 0.1 vars_inside_scopes/X#items.
            z = "oh ya"
#           ^ definition local 2
#           documentation ```python
#                       > builtins.str
#                       > ```

