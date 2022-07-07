# < definition scip-python python snapshot-util 0.1 /__init__:
#documentation (module) 

import sqlparse
#      ^^^^^^^^ reference  sqlparse 0.4.2 sqlparse/__init__:

print(sqlparse.format)
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#external documentation ```python
#            > (function)
#            > print(*values: object, sep: str | None =...
#            > 
#            > print(*values: object, sep: str | None =...
#            > ```
#     ^^^^^^^^ reference  sqlparse 0.4.2 sqlparse/__init__:
#              ^^^^^^ reference local 0
#              documentation ```python
#                          > def format(
#                          >   sql,
#                          >   encoding=None,
#                          >   **options
#                          > ): # -> str:
#                          > ```

