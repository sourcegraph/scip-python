var = ", world!"
# definition  snapshot-util 0.1 fstring/__init__:
#documentation (module) fstring
#^^ definition  snapshot-util 0.1 fstring/var.
#documentation ```python
#            > builtins.str
#            > ```

print(f"var: hello {var}")
#^^^^ reference  python-stdlib 3.10 builtins/print().
#                   ^^^ reference  snapshot-util 0.1 fstring/var.

