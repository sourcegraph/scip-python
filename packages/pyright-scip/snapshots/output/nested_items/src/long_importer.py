# < definition scip-python python snapshot-util 0.1 `src.long_importer`/__init__:

import foo.bar.baz.mod
#      ^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/__init__:

print(foo.bar.baz.mod.SuchNestedMuchWow)
#^^^^ reference  python-stdlib 3.11 builtins/print().
#     ^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `foo.bar.baz.mod`/__init__:
#                     ^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `src.foo.bar.baz.mod`/SuchNestedMuchWow#

