"""Números de la forma  re + m·M  con M simbólico (M → +∞).

La Gran M se resuelve de forma EXACTA: nunca se sustituye M por 1e6.
Dos números se comparan primero por el coeficiente de M y luego por la parte real.
"""
from fractions import Fraction as F


class MNum:
    __slots__ = ("re", "m")

    def __init__(self, re=0, m=0):
        self.re = F(re)
        self.m = F(m)

    def __add__(self, o):
        return MNum(self.re + o.re, self.m + o.m)

    def __sub__(self, o):
        return MNum(self.re - o.re, self.m - o.m)

    def __neg__(self):
        return MNum(-self.re, -self.m)

    def __mul__(self, k):  # solo escalar racional
        k = F(k)
        return MNum(self.re * k, self.m * k)

    __rmul__ = __mul__

    def _key(self):
        return (self.m, self.re)

    def __eq__(self, o):
        return self._key() == o._key()

    def __lt__(self, o):
        return self._key() < o._key()

    def __le__(self, o):
        return self._key() <= o._key()

    def is_zero(self):
        return self.re == 0 and self.m == 0

    def __repr__(self):
        return f"MNum({self.re}, {self.m})"


def msign(x):
    """Signo de un MNum o de una Fraction: -1, 0 o 1."""
    k = x._key() if isinstance(x, MNum) else (0, F(x))
    return (k > (0, 0)) - (k < (0, 0))
