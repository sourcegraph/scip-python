# < definition scip-python pypi snapshot-util 0.1 nameparts/__init__:
#documentation (module) nameparts

import importlib.resources
#      ^^^^^^^^^^^^^^^^^^^ reference  snapshot-util 0.1 `importlib.resources`/__init__:

importlib.resources.read_text('pre_commit.resources', 'filename')
#^^^^^^^^ reference  python-stdlib 3.10 `importlib.resources`/__init__:
#                   ^^^^^^^^^ reference  snapshot-util 0.1 `importlib.resources`/read_text().

