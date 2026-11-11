from fractions import Fraction as F
from .mnum import MNum


def fs(x):
    """Fracción → texto exacto: '7/4', '-3', '0'."""
    x = F(x)
    return str(x.numerator) if x.denominator == 1 else f"{x.numerator}/{x.denominator}"


def cell(x):
    """Celda del tablero: [parte real, coef. de M] como texto exacto."""
    if isinstance(x, MNum):
        return [fs(x.re), fs(x.m)]
    return [fs(x), "0"]


def mtext(x):
    """Texto legible: '-2M + 5', 'M', '3/2'."""
    if not isinstance(x, MNum):
        return fs(x)
    parts = []
    if x.m != 0:
        k = x.m
        parts.append("M" if k == 1 else "-M" if k == -1 else f"{fs(k)}M")
    if x.re != 0 or not parts:
        if parts:
            parts.append(("+ " + fs(x.re)) if x.re > 0 else ("- " + fs(-x.re)))
        else:
            parts.append(fs(x.re))
    return " ".join(parts)
