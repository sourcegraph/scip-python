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
#              external documentation ```python
#                          > (function) format: (sql: Unknown, encodi...
#                          > ```
#              external documentation ---
#                          > 
#              external documentation Format \*sql\* according to \*options\*.
#                          > 
#                          > Available options are documented in `for...
#                          > 
#                          > In addition to the formatting options th...
#                          > keyword "encoding" which determines the ...
#                          > 
#                          > :returns: The formatted SQL statement as...

