class A:
    def x(self) -> int:
        raise NotImplemented

    def unmatched(self, x: int):
        pass

class B(A):
    def x(self) -> int:
        return 5

    def unmatched(self, x: int, y: int):
        pass

    def unrelated(self):
        pass
