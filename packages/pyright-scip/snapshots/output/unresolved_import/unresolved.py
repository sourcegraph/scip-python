# < definition scip-python python snapshot-util 0.1 unresolved/__init__:
#documentation (module) unresolved

import this_is_not_real
#      ^^^^^^^^^^^^^^^^ reference local 0
#      documentation (module): this_is_not_real [unable to re...

print(this_is_not_real.x)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#external documentation ```python
#            > (function)
#            > print(*values: object, sep: str | None =...
#            > 
#            > print(*values: object, sep: str | None =...
#            > ```
#     ^^^^^^^^^^^^^^^^ reference local 0
print(this_is_not_real.x)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#     ^^^^^^^^^^^^^^^^ reference local 0


