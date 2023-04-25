# < definition scip-python python snapshot-util 0.1 builtin_imports/__init__:
#documentation (module) builtin_imports

import re
#      ^^ reference  python-stdlib 3.11 re/__init__:
from typing import Callable, Optional
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
#                  ^^^^^^^^ reference  python-stdlib 3.11 typing/Callable.
#                  external documentation ```python
#                              > (class) Callable
#                              > ```
#                            ^^^^^^^^ reference  python-stdlib 3.11 typing/Optional.
#                            external documentation ```python
#                                        > (class) Optional
#                                        > ```

print(re, Callable, Optional)
#^^^^ reference  python-stdlib 3.11 builtins/__init__:print().
#external documentation ```python
#            > (function) def print(
#            >     *values: object,
#            >     sep: str | None = " ",
#            >     end: str | None = "\n",
#            >     file: SupportsWrite[str] | None = No...
#            >     flush: Literal[False] = False
#            > ) -> None
#            > ```
#     ^^ reference  python-stdlib 3.11 re/__init__:
#         ^^^^^^^^ reference  python-stdlib 3.11 typing/Callable.
#                   ^^^^^^^^ reference  python-stdlib 3.11 typing/Optional.

