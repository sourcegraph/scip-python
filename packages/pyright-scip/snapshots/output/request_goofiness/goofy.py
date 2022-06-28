# < definition scip-python python snapshot-util 0.1 goofy/__init__:
#documentation (module) goofy

import requests
#      ^^^^^^^^ reference  requests 2.0.0 requests/__init__:
#      ^^^^^^^^ reference  requests 2.0.0 requests/__init__:

print(requests.get("https://sourcegraph.com"))
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#     ^^^^^^^^ reference  requests 2.0.0 requests/__init__:
#              ^^^ reference  requests 2.0.0 `requests.api`/get().

