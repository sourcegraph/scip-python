# < definition scip-python python snapshot-util 0.1 nameparts/__init__:
#documentation (module) nameparts

import importlib.resources
#      ^^^^^^^^^^^^^^^^^^^ reference  python-stdlib 3.10 `importlib.resources`/__init__:

importlib.resources.read_text('pre_commit.resources', 'filename')
#^^^^^^^^^^^^^^^^^^ reference  python-stdlib 3.10 `importlib.resources`/__init__:
#                   ^^^^^^^^^ reference local 0
#                   documentation ```python
#                               > def read_text(
#                               >   package: Package,
#                               >   resource: Resource,
#                               >   encoding: str = ...,
#                               >   errors: str = ...
#                               > ) -> str:
#                               > ```
importlib.resources.read_text('pre_commit.resources', 'filename')
#^^^^^^^^ reference  python-stdlib 3.10 `importlib.resources`/__init__:
#                   ^^^^^^^^^ reference local 0

