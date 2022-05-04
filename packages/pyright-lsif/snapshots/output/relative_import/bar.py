# < definition lsif-pyright pypi snapshot-util 0.1 bar/__init__:
#documentation (module) bar

from .foo import exported_function
#    ^^^^ reference  snapshot-util 0.1 foo/__init__:
#                ^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 foo/exported_function().
from .foo import this_class
#    ^^^^ reference  snapshot-util 0.1 foo/__init__:
#                ^^^^^^^^^^ reference  snapshot-util 0.1 foo/this_class.

if True:
    exported_function()
#   ^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 foo/exported_function().

    this_class.exported_function()
#   ^^^^^^^^^^ reference  snapshot-util 0.1 foo/this_class.
#              ^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 foo/MyClass#exported_function().

