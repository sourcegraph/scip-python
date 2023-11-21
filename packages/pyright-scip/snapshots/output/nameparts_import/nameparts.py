# < definition scip-python python snapshot-util 0.1 nameparts/__init__:

import importlib.resources
#      ^^^^^^^^^^^^^^^^^^^ reference  python-stdlib 3.11 `importlib.resources`/__init__:

importlib.resources.read_text('pre_commit.resources', 'filename')
#^^^^^^^^^^^^^^^^^^ reference  python-stdlib 3.11 `importlib.resources`/__init__:
#                   ^^^^^^^^^ reference local 0
importlib.resources.read_text('pre_commit.resources', 'filename')
#^^^^^^^^ reference  python-stdlib 3.11 `importlib.resources`/__init__:
#                   ^^^^^^^^^ reference local 0

