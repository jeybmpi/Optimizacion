"""Validación y normalización de la entrada. Devuelve (problema, errores)."""
from fractions import Fraction as F

MAX_N = 20
MAX_M = 20
OPS = ("<=", ">=", "=")


def parse_number(v):
    """Acepta int, float, '3', '-2.5', '3/4'. Lanza ValueError si no es un número finito."""
    if isinstance(v, bool):
        raise ValueError("no es un número")
    if isinstance(v, (int, float)):
        if v != v or v in (float("inf"), float("-inf")):
            raise ValueError("no es finito")
        return F(str(v))
    if isinstance(v, str):
        s = v.strip().replace(",", ".")
        if s == "":
            raise ValueError("vacío")
        return F(s)  # F('3/4'), F('-2.5')
    raise ValueError("no es un número")


def validate(raw):
    errors = []
    if not isinstance(raw, dict):
        return None, ["El problema debe enviarse como un objeto JSON."]

    sense = raw.get("sense")
    if sense not in ("max", "min"):
        errors.append("El objetivo debe ser 'max' o 'min'.")

    c_raw = raw.get("c")
    cons_raw = raw.get("constraints")
    if not isinstance(c_raw, list) or len(c_raw) == 0:
        errors.append("Debe haber al menos una variable (coeficientes de la función objetivo).")
        return None, errors
    if not isinstance(cons_raw, list) or len(cons_raw) == 0:
        errors.append("Debe haber al menos una restricción.")
        return None, errors

    n, m = len(c_raw), len(cons_raw)
    if n > MAX_N:
        errors.append(f"Máximo {MAX_N} variables.")
    if m > MAX_M:
        errors.append(f"Máximo {MAX_M} restricciones.")

    c = []
    for j, v in enumerate(c_raw):
        try:
            c.append(parse_number(v))
        except (ValueError, ZeroDivisionError):
            errors.append(f"Función objetivo: el coeficiente de x{j+1} no es un número válido.")
            c.append(F(0))

    cons = []
    for i, r in enumerate(cons_raw):
        if not isinstance(r, dict):
            errors.append(f"Restricción {i+1}: formato inválido.")
            continue
        a_raw = r.get("a")
        if not isinstance(a_raw, list) or len(a_raw) != n:
            errors.append(
                f"Restricción {i+1}: tiene {len(a_raw) if isinstance(a_raw, list) else 0} "
                f"coeficientes pero el problema tiene {n} variables."
            )
            continue
        a = []
        for j, v in enumerate(a_raw):
            try:
                a.append(parse_number(v))
            except (ValueError, ZeroDivisionError):
                errors.append(f"Restricción {i+1}: el coeficiente de x{j+1} no es un número válido.")
                a.append(F(0))
        op = r.get("op")
        if op not in OPS:
            errors.append(f"Restricción {i+1}: el tipo debe ser ≤, ≥ o =.")
        try:
            b = parse_number(r.get("b"))
        except (ValueError, ZeroDivisionError):
            errors.append(f"Restricción {i+1}: el lado derecho no es un número válido.")
            b = F(0)
        cons.append({"a": a, "op": op, "b": b})

    if errors:
        return None, errors
    return {"sense": sense, "c": c, "constraints": cons, "n": n, "m": m}, []
