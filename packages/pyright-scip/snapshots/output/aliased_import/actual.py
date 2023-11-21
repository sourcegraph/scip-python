# < definition scip-python python snapshot-util 0.1 actual/__init__:

import aliased
#      ^^^^^^^ reference  snapshot-util 0.1 aliased/__init__:
import aliased as A
#      ^^^^^^^ reference  snapshot-util 0.1 aliased/__init__:
#                 ^ reference local 0

print(A.SOME_CONSTANT)
#^^^^ reference  python-stdlib 3.11 builtins/print().
#     ^ reference local 0
#       ^^^^^^^^^^^^^ reference  snapshot-util 0.1 aliased/SOME_CONSTANT.

