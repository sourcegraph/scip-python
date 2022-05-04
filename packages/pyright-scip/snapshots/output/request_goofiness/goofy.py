# < definition scip-python pypi snapshot-util 0.1 goofy/__init__:
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

print(requests.get("https://sourcegraph.com"))
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#documentation 
#     ^^^^^^^^ reference  requests 2.0.0 requests/__init__:
#              ^^^ reference  requests 2.0.0 `requests.api`/get().
#              documentation ```python
#                          > (function) get: (url: str | bytes, params: _Params | None = ..., data: Any | None = ..., headers: Any | None = ..., cookies: Any | None = ..., files: Any | None = ..., auth: Any | None = ..., timeout: Any | None = ..., allow_redirects: bool = ..., proxies: Any | None = ..., hooks: Any | None = ..., stream: Any | None = ..., verify: Any | None = ..., cert: Any | None = ..., json: Any | None = ...) -> Response
#                          > ```
#              documentation ---
#                          > 
#              documentation Sends a GET request.
#                          > 
#                          > :param url: URL for the new `Request` object.\
#                          > :param params: (optional) Dictionary, list of tuples or bytes to send\
#                          > &nbsp;&nbsp;&nbsp;&nbsp;in the query string for the `Request`.\
#                          > :param \*\*kwargs: Optional arguments that `request` takes.\
#                          > :return: `Response <Response>` object\
#                          > :rtype: requests.Response

