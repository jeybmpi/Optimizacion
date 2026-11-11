from .bigm import gran_m
from .revised import simplex_revised
from .validate import validate

METHODS = {"bigm": gran_m, "revised": simplex_revised}


def solve_problem(raw, with_steps=True, method="bigm"):
    """Punto de entrada único. Siempre devuelve un diccionario con 'status'."""
    if method not in METHODS:
        return {"status": "invalid", "errors": ["Método desconocido: usa 'bigm' o 'revised'."]}
    p, errors = validate(raw)
    if errors:
        return {"status": "invalid", "errors": errors}
    try:
        res = METHODS[method](p, with_steps=with_steps)
    except Exception as e:  # nunca un error crudo para el usuario
        return {"status": "error", "message": f"No se pudo resolver el problema: {e}"}
    res["method"] = method
    res["sense"] = p["sense"]
    res["n"] = p["n"]
    res["m"] = p["m"]
    return res
