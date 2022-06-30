# < definition scip-python python snapshot-util 0.1 actual/__init__:
#documentation (module) actual

import aliased
import aliased as A

print(A.SOME_CONSTANT)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#     ^ reference  snapshot-util 0.1 aliased/__init__:A.
#       ^^^^^^^^^^^^^ reference  snapshot-util 0.1 aliased/SOME_CONSTANT.

