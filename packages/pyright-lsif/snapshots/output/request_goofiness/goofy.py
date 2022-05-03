# < definition lsif-pyright pypi snapshot-util 0.1 goofy/__init__:
#documentation (module) goofy

import requests
#      ^^^^^^^^ reference  requests 2.0.0 requests/__init__:

requests.get("https://sourcegraph.com")
#^^^^^^^ reference  snapshot-util 0.1 requests/__init__:
#        ^^^ reference  snapshot-util 0.1 `requests.api`/get().

