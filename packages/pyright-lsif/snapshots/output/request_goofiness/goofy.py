# < definition lsif-pyright pypi snapshot-util 0.1 goofy/__init__:
#documentation (module) goofy

import requests
#      ^^^^^^^^ reference  requests 2.0.0 requests/__init__:
#      documentation (module) requests
#      documentation 
#                  > Requests HTTP Library
#                  > ~~~~~~~~~~~~~~~~~~~~~
#                  > 
#                  > Requests is an HTTP library, written in Python, for human beings.
#                  > Basic GET usage:
#                  > 
#                  >    >>> import requests
#                  >    >>> r = requests.get('https://www.python.org')
#                  >    >>> r.status_code
#                  >    200
#                  >    >>> b'Python is a programming language' in r.content
#                  >    True
#                  > 
#                  > ... or POST:
#                  > 
#                  >    >>> payload = dict(key1='value1', key2='value2')
#                  >    >>> r = requests.post('https://httpbin.org/post', data=payload)
#                  >    >>> print(r.text)
#                  >    {
#                  >      ...
#                  >      "form": {
#                  >        "key1": "value1",
#                  >        "key2": "value2"
#                  >      },
#                  >      ...
#                  >    }
#                  > 
#                  > The other HTTP methods are supported - see `requests.api`. Full documentation
#                  > is at <https://requests.readthedocs.io>.
#                  > 
#                  > :copyright: (c) 2017 by Kenneth Reitz.
#                  > :license: Apache 2.0, see LICENSE for more details.
#                  > 

requests.get("https://sourcegraph.com")
#^^^^^^^ reference  requests 2.0.0 requests/__init__:
#        ^^^ reference  snapshot-util 0.1 `requests.api`/get().

