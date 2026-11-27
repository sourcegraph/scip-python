# < definition scip-python python snapshot-util 0.1 walrus/__init__:

xs = [1, 2, 3]
#^ definition  snapshot-util 0.1 walrus/xs.

if (n := len(xs)) > 0:
#   ^ definition  snapshot-util 0.1 walrus/n.
#        ^^^ reference local 0
#            ^^ reference  snapshot-util 0.1 walrus/xs.
    pass

# PEP 572: the target of an assignment expression inside a comprehension
# binds in the scope that contains the comprehension, here the module.
a = [y for x in xs if (y := x * 2) > 1]
# definition  snapshot-util 0.1 walrus/a.
#    ^ reference  snapshot-util 0.1 walrus/y.
#          ^ definition local 1
#               ^^ reference  snapshot-util 0.1 walrus/xs.
#                      ^ definition  snapshot-util 0.1 walrus/y.
#                           ^ reference local 1
b = {z for x in xs if (z := x + 1)}
# definition  snapshot-util 0.1 walrus/b.
#    ^ reference  snapshot-util 0.1 walrus/z.
#          ^ definition local 2
#               ^^ reference  snapshot-util 0.1 walrus/xs.
#                      ^ definition  snapshot-util 0.1 walrus/z.
#                           ^ reference local 2
c = {k: k for x in xs if (k := str(x))}
# definition  snapshot-util 0.1 walrus/c.
#    ^ reference  snapshot-util 0.1 walrus/k.
#       ^ reference  snapshot-util 0.1 walrus/k.
#             ^ definition local 3
#                  ^^ reference  snapshot-util 0.1 walrus/xs.
#                         ^ definition  snapshot-util 0.1 walrus/k.
#                              ^^^ reference  python-stdlib 3.11 builtins/str#
#                                  ^ reference local 3
d = list(w for x in xs if (w := x - 1))
# definition  snapshot-util 0.1 walrus/d.
#   ^^^^ reference  python-stdlib 3.11 builtins/list#
#        ^ reference  snapshot-util 0.1 walrus/w.
#              ^ definition local 4
#                   ^^ reference  snapshot-util 0.1 walrus/xs.
#                          ^ definition  snapshot-util 0.1 walrus/w.
#                               ^ reference local 4
e = [(v := x) for x in xs]
# definition  snapshot-util 0.1 walrus/e.
#     ^ definition  snapshot-util 0.1 walrus/v.
#          ^ reference local 5
#                 ^ definition local 5
#                      ^^ reference  snapshot-util 0.1 walrus/xs.
print(y, z, k, w, v)
#^^^^ reference  python-stdlib 3.11 builtins/print().
#     ^ reference  snapshot-util 0.1 walrus/y.
#        ^ reference  snapshot-util 0.1 walrus/z.
#           ^ reference  snapshot-util 0.1 walrus/k.
#              ^ reference  snapshot-util 0.1 walrus/w.
#                 ^ reference  snapshot-util 0.1 walrus/v.


def f():
#   ^ definition  snapshot-util 0.1 walrus/f().
    # Inside a function the target is a local of the function.
    return [q for x in xs if (q := x)]
#           ^ reference local 6
#                 ^ definition local 7
#                      ^^ reference  snapshot-util 0.1 walrus/xs.
#                             ^ definition local 6
#                                  ^ reference local 7

