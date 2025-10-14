from functional import *
from toolz import curry

if __name__ == "__main__":

    class State(Monad):
        def __init__(self, value=None, eval=None):
            if not eval: # unit
                eval = lambda state: (value, state)
            self.eval_ = eval

        def eval(self, state):
            return self.eval_(state)

        def bind(self, fn):
            def eval_state(state):
                # 1. (a, y) = m x
                val, state = self.eval(state)
                # 2. b, z) = k a y
                return fn(val).eval(state)
            return State(eval=eval_state)

    def test_state():
        def market_order(amount):
            return lambda order: \
                    State(('market', amount), lambda balance: (('market', amount), balance - amount * 1.0075))

        def limit_order(amount):
            return lambda order: \
                    State(('limit', amount), lambda balance: (('limit', amount), balance + amount * 0.9975))

        def withdraw(amount):
            return lambda order: \
                    State(('withdraw', amount), lambda balance: (('withdraw', amount), balance - amount))

        trading = State() >> market_order(1000) >> market_order(-200) >> limit_order(200) >> withdraw(100)
        print("0: ", trading.eval(0))
        print("1000: ", trading.eval(1000))

    class Output(Monad):
        """ type M a = (Output, a) """
        def __init__(self, value, *, out=""):
            self.out = out
            self.value = value

        def bind(self, fn):
            m = fn(self.value)
            return Output(m.value, out=self.out + m.out)

        def eval(self):
            print(f"value: {self.value} \n {self.out}")




    class Maybe(Monad):
        def __init__(self, value):
            self.value = value

        def bind(self, fn):
            if self.value is None:
                return Nothing()
            return fn(self.value)

        def eval(self):
            if type(self) is Nothing:
                return None
            elif type(self) is Just:
                return self.value

        def __repr__(self):
            return f"{self.__class__.__name__}({self.value})"

    class Nothing(Maybe):
        def __init__(self):
            self.value = ""

        def bind(self, fn):
            return Nothing()

    class Just(Maybe):
        def bind(self, fn):
            try:
                result = fn(self.value)
                return result
            except Exception:
                return Nothing()

    def test_maybe():
        @curry
        def div(x, y):
            """ a -> M a """
            return Just(x / y) if y != 0 else Nothing()

        print("Just(10) >> div(50) =", Just(10) >> div(50))
        print("Just(10) >> Nothing() >> div(50) =", (Just(10) >> Nothing() >> div(50)))

        print("---")
        chain = lambda x: div(x, y=3) >> (lambda v: Just(v - 1)) >> div(12) # 12 / (x / 3 - 1)
        print("Just(15) >> chain >> chain =", (Just(15) >> chain >> chain))
        print("_---_")
        print("Just(15) >> chain =", (Just(15) >> chain))
        print("Just(3) >> chain =", (Just(3) >> chain))


    def test_output():
        def plus1(x):
            """ a -> M a """
            return Output(x + 1, out="+ 1 ")

        o = Output(10)
        m = o >> plus1 >> plus1 >> (lambda x: Output(x // 2, out="/ 2 "))
        m.eval()

    test_state()

    # spirograph monad:
    # lambda x, y: lambda t: (x + cos(t), y + sin(t))
    # k1, k2, k3, k4 - defaults
    # new one: kx = (k1 * k2) (class Control)
