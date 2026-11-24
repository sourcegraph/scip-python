xs = [1, 2, 3]

if (n := len(xs)) > 0:
    pass

# PEP 572: the target of an assignment expression inside a comprehension
# binds in the scope that contains the comprehension, here the module.
a = [y for x in xs if (y := x * 2) > 1]
b = {z for x in xs if (z := x + 1)}
c = {k: k for x in xs if (k := str(x))}
d = list(w for x in xs if (w := x - 1))
e = [(v := x) for x in xs]
print(y, z, k, w, v)


def f():
    # Inside a function the target is a local of the function.
    return [q for x in xs if (q := x)]
