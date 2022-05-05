class Example:
    # No field hint, like this
    # x: int

    def __init__(self, x, y: str):
        self.x = x
        self.y = y

    def something(self):
        print(self.x)
        print(self.y)
