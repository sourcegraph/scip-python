# < definition scip-python pypi snapshot-util 0.1 src/__init__:
#documentation (module) src

import leftpad
#      ^^^^^^^ reference  leftpad 0.1.2 leftpad/__init__:
#      documentation (module) leftpad
#      documentation ```
#                  > Left pad a string.
#                  > 
#                  > >>> left_pad("foo", 5)
#                  > '  foo'
#                  > 
#                  > >>> left_pad("foobar", 6)
#                  > 'foobar'
#                  > 
#                  > >>> left_pad(1, 2, '0')
#                  > '01'
#                  > 
#                  > >>> left_pad(17, 5, 0)
#                  > '00017'
#                  > ```

print(leftpad)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#documentation 
#     ^^^^^^^ reference  leftpad 0.1.2 leftpad/__init__:

