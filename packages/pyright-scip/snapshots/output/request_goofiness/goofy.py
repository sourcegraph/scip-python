# < definition scip-python pypi snapshot-util 0.1 goofy/__init__:
#documentation (module) goofy

import requests
#      ^^^^^^^^ reference  requests 2.0.0 requests/__init__:
#      ^^^^^^^^ reference  requests 2.0.0 requests/__init__:

print(requests.get("https://sourcegraph.com"))
#^^^^ reference  python-stdlib 3.10 builtins/__init__:print().
#documentation ```python
#            > (function)
#            > print(*values: object, sep: str | None = ..., end: str | None = ..., file: SupportsWrite[str] | None = ..., flush: Literal[False] = ...) -> None
#            > 
#            > print(*values: object, sep: str | None = ..., end: str | None = ..., file: _SupportsWriteAndFlush[str] | None = ..., flush: bool) -> None
#            > ```
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

