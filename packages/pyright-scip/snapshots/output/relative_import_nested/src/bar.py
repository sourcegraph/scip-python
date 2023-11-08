# < definition scip-python python snapshot-util 0.1 `src.bar`/__init__:
#documentation (module) src.bar

from .foo import exported_function
#    ^^^^ reference  snapshot-util 0.1 foo/__init__:
from .foo import this_class
#    ^^^^ reference  snapshot-util 0.1 foo/__init__:

if True:
    exported_function()
#   ^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo`/exported_function().

    this_class.exported_function()
#   ^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo`/this_class.
#              ^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo`/MyClass#exported_function().

