# < definition lsif-pyright pypi snapshot-util 0.1 src/__init__:
#documentation (module) src

import leftpad
#      ^^^^^^^ reference  leftpad 0.1.2 leftpad/__init__:

print(leftpad)
#^^^^ reference local 0print().
#     ^^^^^^^ reference  snapshot-util 0.1 leftpad/__init__:

