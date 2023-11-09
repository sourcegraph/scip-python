# < definition scip-python python snapshot-util 0.1 function/__init__:
#documentation (module) function

def function_a(x):
#   ^^^^^^^^^^ definition <enclosing 0, 0, 3, 13> snapshot-util 0.1 function/function_a().
#   documentation ```python
#               > def function_a(
#               >   x
#               > ):
#               > ```
#              ^ definition snapshot-util 0.1 function/function_a().(x)
  test = x
# ^^^^ definitionlocal 0
# documentation ```python
#             > typing.Any
#             > ```
#        ^ reference snapshot-util 0.1 function/function_a().(x)

  return test
#        ^^^^ referencelocal 0

class Test():
#     ^^^^ definition <enclosing 5, 0, 11, 6> snapshot-util 0.1 function/Test#
#     documentation ```python
#                 > class Test:
#                 > ```
#     ^^^^ definition snapshot-util 0.1 function/Test#

  def method():
#     ^^^^^^ definition <enclosing 7, 2, 9, 17> snapshot-util 0.1 function/Test#method().
#     documentation ```python
#                 > def method(): # -> (x: Unknown) -> Unkno...
#                 > ```
    caller = lambda x: x + 1
#   ^^^^^^ definitionlocal 1
#                   ^ definitionlocal 2(x)
#                      ^ referencelocal 2(x)
    return caller
#          ^^^^^^ referencelocal 1

  pass

