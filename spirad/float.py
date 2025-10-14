
class CustomFloat(float):
    def __new__(cls, value, *args, **kwargs):
        return super().__new__(cls, value)

    def __init__(self, value, extra_param):
        self.extra_param = extra_param

    def __repr__(self):
        return f"CustomFloat({super().__repr__()}, extra_param={self.extra_param})"

cf = CustomFloat(0.1, "a")
