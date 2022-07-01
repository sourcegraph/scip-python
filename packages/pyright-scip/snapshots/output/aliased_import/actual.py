# < definition scip-python python snapshot-util 0.1 actual/__init__:
#documentation (module) actual

import aliased
#      ^^^^^^^ reference  snapshot-util 0.1 aliased/__init__:
import aliased as A
#      ^^^^^^^^^^^^ reference  snapshot-util 0.1 aliased/__init__:

print(A.SOME_CONSTANT)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#     ^ reference  snapshot-util 0.1 aliased/__init__:
#       ^^^^^^^^^^^^^ reference  snapshot-util 0.1 aliased/SOME_CONSTANT.

