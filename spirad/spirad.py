from functional import Functor, Monad
import math

from inspect import signature
from functools import partial

from toolz import curry

class Spirad(Monad):
    """
    Monādisks spirografs.
    - Būvē funkciju lambda t:, kas nonāk līdz zīmpunktam
    - Dod glsl izpildījumu šai funkcijai
    Zīmpunkts:
        - zīmīgs punkts (vieta, kur beidzas viens spirogrāfs , sākas cits)
        - punkts, kurā zīmēt pikseli, ja tas ir pēdējais spirogrāfs
    """
    def __init__(self, gear_point=lambda t: (0, 0)):
        self.gear_point = gear_point

    def bind(self, fn):
        return fn(self)

@curry
class Return(Spirad):
    def __init__(self, gear_point=lambda t: (0, 0)):
        super().__init__(gear_point)

    def __call__(self, t):
        return self.gear_point(t)

    def glsl(self):
        return ""

@curry
class Gear(Spirad):
    def __init__(self, gear_point, r=1.0, phi=0.5, initial=False):
        super().__init__(gear_point)
        self.r = r
        self.phi = phi
        self.initial = initial

    def __call__(self, t):
        x, y = self.gear_point(t)
        return (x + self.r * math.cos(self.phi * t),
                y - self.r * math.sin(self.phi * t))

    def glsl(self):
        sign = "-"
        if self.initial:
            sign = "+"
        return \
            f"""
                x += {self.r} * cos({self.phi} * t);
                y {sign}= {self.r} * sin({self.phi} * t);
            """

class OutputT(Monad):
    """ Monāds iekšā, monāds ārā """
    def __init__(self, monad: Spirad, out = ""):
        self.monad = monad
        self.out = out

    def bind(self, fn):
        m = fn(self.monad)
        flat = m.monad if isinstance(m, OutputT) else m
        return OutputT(flat, self.out + m.glsl())

    def glsl(self):
        return self.out


#Spirad(0, 0) >>= lambda x, y: Spirad(x, y) >>= lambda x, y: Spirad(x, y) >>= lambda x, y: Spirad(x, y)
# s = Spirad(0, 0) >> Spirad(0.3) >> Spirad(0.9) >> Nice(3)
# s(10) = (0.0, 0.5)
if __name__ == "__main__":
    s = (OutputT(Return()) >> Gear(r=0.7))
    s1 = s >> (lambda s: Return(lambda t: tuple(x for x in s(t))))
    s2 = s1 >> Gear(r=0.5)
    # TODO: JOIN?
    s3 = s2 >> (lambda s: (s1 >> (lambda s2: Return(lambda t: tuple([s(t)[0], s1(t)[1]])))))
    breakpoint()
    #for i in range(100):
    #    print(s3(i))
