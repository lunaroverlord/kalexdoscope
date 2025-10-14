class Functor:
    def __init__(self, value):
        self.value = value

    def fmap(self, fn):
        return self.__class__(fn(self.value))

    def __irshift__(self, fn):
        return self.fmap(fn)


class Monad(Functor):
    def __init__(self, value):
        self.value = value

    def bind(self, fn):
        return fn(self.value)

    def __rshift__(self, fn):
        return self.bind(fn)



