import pathlib

numbers = [2, 8, 0, 1, 1, 9, 7, 7]

description = {
    "length": (num_length := len(numbers)),
    "sum": (num_sum := sum(numbers)),
    "mean": num_sum / num_length,
}

print(num_length)

def inside_function():
    inner = [2, 8, 0, 1, 1, 9, 7, 7]
    inner_desc = {
        "length": (num_length := len(inner)),
        "sum": (num_sum := sum(inner)),
        "mean": num_sum / num_length,
    }
