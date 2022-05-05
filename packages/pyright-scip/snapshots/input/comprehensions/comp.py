def something(x):
    return 2 * x
_ = [x for x in "should be local 0"]
_ = [something(x) for x in "should be local 1"]

# TODO: ListComprehensions with if
# TODO: Dictionary comprehensions

