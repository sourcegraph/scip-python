# < definition scip-python python abc 16.05 main/__init__:

from helpers import value
#    ^^^^^^^ reference  abc 16.05 helpers/__init__:
#                   ^^^^^ reference  abc 16.05 helpers/value().

def main():
#   ^^^^ definition  abc 16.05 main/main().
    return value()
#          ^^^^^ reference  abc 16.05 helpers/value().

main()
#^^^ reference  abc 16.05 main/main().

