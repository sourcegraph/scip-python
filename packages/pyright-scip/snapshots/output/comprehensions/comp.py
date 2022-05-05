# < definition scip-python pypi snapshot-util 0.1 comp/__init__:
#documentation (module) comp

def something(x):
#   ^^^^^^^^^ definition  snapshot-util 0.1 comp/something().
#   documentation ```python
#               > def something(
#               >   x
#               > ):
#               > ```
#             ^ definition  snapshot-util 0.1 comp/something().(x)
    return 2 * x
#              ^ reference  snapshot-util 0.1 comp/something().(x)
_ = [x for x in "should be local 0"]
# definition  snapshot-util 0.1 comp/_.
#documentation ```python
#            > builtins.list
#            > ```
#    ^ reference local 0
#          ^ definition local 0
_ = [something(x) for x in "should be local 1"]
# reference  snapshot-util 0.1 comp/_.
#    ^^^^^^^^^ reference  snapshot-util 0.1 comp/something().
#              ^ reference local 1
#                     ^ definition local 1

# TODO: ListComprehensions with if
# TODO: Dictionary comprehensions


