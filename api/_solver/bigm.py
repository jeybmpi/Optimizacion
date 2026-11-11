"""Método de la Gran M (simplex tabular) con aritmética exacta.

Propio del equipo: no usa ninguna librería de optimización.
"""
from fractions import Fraction as F

from .fmt import cell, fs, mtext
from .mnum import MNum, msign

M_ONE = MNum(0, 1)
MAX_ITERS = 500
BLAND_AFTER = 100  # si hay muchas iteraciones, se cambia a la regla de Bland (anti-ciclos)


# ---------------------------------------------------------------- utilidades de texto
def lin_text(coefs, names):
    """'3x1 - 2x2 + s1' a partir de coeficientes racionales."""
    out = []
    for k, nm in zip(coefs, names):
        k = F(k)
        if k == 0:
            continue
        mag = abs(k)
        body = nm if mag == 1 else f"{fs(mag)}{nm}"
        if not out:
            out.append(body if k > 0 else "-" + body)
        else:
            out.append(("+ " if k > 0 else "- ") + body)
    return " ".join(out) if out else "0"


def mag_text(f):
    f = abs_m(f)
    if isinstance(f, MNum) and f.re != 0 and f.m != 0:
        return f"({mtext(f)})"
    t = mtext(f)
    return t


def abs_m(x):
    if isinstance(x, MNum):
        return x if msign(x) >= 0 else -x
    return abs(x)


def is_one(x):
    return (not isinstance(x, MNum) and x == 1) or (isinstance(x, MNum) and x.m == 0 and x.re == 1)


# ---------------------------------------------------------------- construcción
def build(p):
    n, m = p["n"], p["m"]
    sense = p["sense"]
    c_max = list(p["c"]) if sense == "max" else [-x for x in p["c"]]

    rows, notes = [], []
    for i, con in enumerate(p["constraints"]):
        a, op, b = list(con["a"]), con["op"], con["b"]
        if b < 0:
            a, b = [-x for x in a], -b
            new_op = {"<=": ">=", ">=": "<=", "=": "="}[op]
            sym = {"<=": "≤", ">=": "≥", "=": "="}
            notes.append(
                f"Restricción {i+1}: el lado derecho era negativo; se multiplicó por −1 "
                f"({sym[op]} pasa a {sym[new_op]})."
            )
            op = new_op
        rows.append({"a": a, "op": op, "b": b})

    names = [f"x{j+1}" for j in range(n)]
    kinds = ["x"] * n
    slack_col = [None] * m
    art_col = [None] * m
    for i, r in enumerate(rows):
        if r["op"] == "<=":
            slack_col[i] = len(names)
            names.append(f"s{i+1}")
            kinds.append("s")
            notes.append(f"Restricción {i+1} (≤): se suma la holgura s{i+1}.")
        elif r["op"] == ">=":
            slack_col[i] = len(names)
            names.append(f"e{i+1}")
            kinds.append("e")
    for i, r in enumerate(rows):
        if r["op"] in (">=", "="):
            art_col[i] = len(names)
            names.append(f"a{i+1}")
            kinds.append("a")
            if r["op"] == ">=":
                notes.append(
                    f"Restricción {i+1} (≥): se resta el exceso e{i+1} y se suma la artificial a{i+1}."
                )
            else:
                notes.append(f"Restricción {i+1} (=): se suma la artificial a{i+1}.")

    N = len(names)
    A, basis = [], []
    for i, r in enumerate(rows):
        row = [F(0)] * N
        for j in range(n):
            row[j] = r["a"][j]
        if r["op"] == "<=":
            row[slack_col[i]] = F(1)
            basis.append(slack_col[i])
        elif r["op"] == ">=":
            row[slack_col[i]] = F(-1)
            row[art_col[i]] = F(1)
            basis.append(art_col[i])
        else:
            row[art_col[i]] = F(1)
            basis.append(art_col[i])
        row.append(r["b"])
        A.append(row)

    # renglón (0):  z_j − c_j   (forma de maximización, artificiales con costo −M → +M)
    row0 = [MNum(-c_max[j]) if j < n else MNum(0) for j in range(N)]
    for j in range(N):
        if kinds[j] == "a":
            row0[j] = MNum(0, 1)
    row0.append(MNum(0))

    sense_txt = "Max" if sense == "max" else "Min"
    orig_obj = f"{sense_txt} Z = {lin_text(p['c'], names[:n])}"
    arts = [names[j] for j in range(N) if kinds[j] == "a"]
    if sense == "min":
        notes.insert(0, "Minimizar Z equivale a maximizar Z' = −Z; se trabaja con Z' y al final se invierte el signo.")
    z_name = "Z" if sense == "max" else "Z'"
    obj_terms = lin_text(c_max, names[:n])
    pen = "".join(f" − M·{a}" for a in arts)
    max_obj = f"Max {z_name} = {obj_terms}{pen}"
    # ecuación (0) legible: Z − c1x1 − c2x2 + M·a1 = 0
    eq0 = z_name
    for j in range(n):
        k = -c_max[j]
        if k != 0:
            mag = abs(k)
            body = names[j] if mag == 1 else f"{fs(mag)}{names[j]}"
            eq0 += (" + " if k > 0 else " − ") + body
    for a in arts:
        eq0 += f" + M·{a}"
    eq0 += " = 0"
    equations = []
    for i, r in enumerate(rows):
        lhs = lin_text(A[i][:-1], names)
        equations.append(f"{lhs} = {fs(r['b'])}")

    std = {
        "original_objective": orig_obj,
        "objective": max_obj,
        "equation0": eq0,
        "equations": equations,
        "notes": notes,
        "has_artificial": bool(arts),
        "z_name": z_name,
    }
    return names, kinds, A, row0, basis, rows, std


# ---------------------------------------------------------------- núcleo
def snapshot(k, title, names, T, basis, extra=None):
    d = {
        "k": k,
        "title": title,
        "columns": names,
        "basis": ["Z"] + [names[b] for b in basis],
        "rows": [[cell(v) for v in row] for row in T],
    }
    if extra:
        d.update(extra)
    return d


def pivot(T, basis, r, j):
    """Operaciones de renglón. T[0] es MNum, T[1:] son Fraction. Devuelve texto de operaciones."""
    ops = []
    pv = T[r][j]
    if pv != 1:
        T[r] = [v / pv for v in T[r]]
        ops.append(f"({r}) ← ({r}) ÷ {fs(pv)}")
    for i in range(1, len(T)):
        if i == r or T[i][j] == 0:
            continue
        f = T[i][j]
        T[i] = [a - f * b for a, b in zip(T[i], T[r])]
        sign = "−" if f > 0 else "+"
        mag = abs(f)
        coef = "" if mag == 1 else f"{fs(mag)}·"
        ops.append(f"({i}) ← ({i}) {sign} {coef}({r})")
    f0 = T[0][j]
    if not f0.is_zero():
        T[0] = [a - f0 * b for a, b in zip(T[0], T[r])]  # MNum − MNum*Fraction
        sign = "−" if msign(f0) > 0 else "+"
        mag = abs_m(f0)
        coef = "" if is_one(mag) else f"{mag_text(mag)}·"
        ops.append(f"(0) ← (0) {sign} {coef}({r})")
    basis[r - 1] = j
    return ops


def ratio_test(T, j):
    out = []
    for i in range(1, len(T)):
        a = T[i][j]
        out.append((i, (T[i][-1] / a) if a > 0 else None))
    return out


def values_from(T, basis, N):
    v = [F(0)] * N
    for i, b in enumerate(basis):
        v[b] = T[i + 1][-1]
    return v


def gran_m(p, with_steps=True):
    names, kinds, A, row0, basis, rows, std = build(p)
    n, m, N = p["n"], p["m"], len(names)
    T = [row0] + A
    iters = []

    if with_steps and std["has_artificial"]:
        iters.append(snapshot(
            -1, "Tablero inicial con M (antes de eliminar M de las columnas básicas)", names, T, basis
        ))
        std["initial_has_M_issue"] = True

    # eliminar M de las columnas de las artificiales básicas
    elim_ops = []
    for i, b in enumerate(basis):
        if kinds[b] == "a":
            T[0] = [a - M_ONE * v for a, v in zip(T[0], T[i + 1])]
            elim_ops.append(f"(0) ← (0) − M·({i+1})")

    it = 0
    status = None
    degenerate_steps = []
    while True:
        candidates = [j for j in range(N) if j not in basis and kinds[j] != "a" and msign(T[0][j]) < 0]
        title = "Tablero inicial (iteración 0)" if it == 0 else f"Iteración {it}"
        extra = {}
        if it == 0 and elim_ops:
            extra["pre_ops"] = elim_ops
        if not candidates:
            if with_steps:
                extra["decision"] = ["Todos los coeficientes del renglón (0) son ≥ 0: se cumple la prueba de optimalidad."]
                iters.append(snapshot(it, title + " — óptimo", names, T, basis, extra))
            status = "optimal"
            break

        if it > BLAND_AFTER:
            j = min(candidates)
            rule = "regla de Bland (índice menor) para evitar ciclos"
        else:
            j = min(candidates, key=lambda c: (T[0][c], c))
            rule = "el coeficiente más negativo del renglón (0)"
        ties = [c for c in candidates if T[0][c] == T[0][j] and c != j]
        rt = ratio_test(T, j)
        positives = [(i, r) for i, r in rt if r is not None]
        enter_txt = f"Entra {names[j]}: {rule} ({mtext(T[0][j])})."
        if ties and it <= BLAND_AFTER:
            enter_txt += " Hubo empate con " + ", ".join(names[c] for c in ties) + "; se eligió el de menor índice."

        if not positives:
            if with_steps:
                extra.update({
                    "entering": {"col": j, "name": names[j]},
                    "ratios": [{"row": i, "basic": names[basis[i - 1]], "ratio": None} for i, _ in rt],
                    "decision": [enter_txt,
                                 f"Ningún elemento de la columna de {names[j]} es positivo: no hay razón mínima."],
                })
                iters.append(snapshot(it, title + " — no acotado", names, T, basis, extra))
            status = "unbounded"
            unbounded_var = names[j]
            break

        minr = min(r for _, r in positives)
        tied_rows = [i for i, r in positives if r == minr]
        r = min(tied_rows, key=lambda i: basis[i - 1])
        pv = T[r][j]
        leave_txt = f"Sale {names[basis[r-1]]}: razón mínima = {fs(minr)} (renglón {r})."
        if len(tied_rows) > 1:
            leave_txt += (" Empate en la razón mínima entre "
                          + ", ".join(names[basis[i - 1]] for i in tied_rows)
                          + ": la solución será degenerada (alguna variable básica valdrá 0).")
            degenerate_steps.append(it)
        elif minr == 0:
            leave_txt += " La razón mínima es 0: el paso es degenerado (Z no mejora)."
            degenerate_steps.append(it)

        snap_idx = None
        if with_steps:
            extra.update({
                "entering": {"col": j, "name": names[j], "value": cell(T[0][j])},
                "ratios": [
                    {"row": i, "basic": names[basis[i - 1]],
                     "num": fs(T[i][-1]), "den": fs(T[i][j]) if T[i][j] > 0 else None,
                     "ratio": fs(rr) if rr is not None else None}
                    for i, rr in rt
                ],
                "leaving": {"row": r, "name": names[basis[r - 1]]},
                "pivot": {"row": r, "col": j, "value": fs(pv)},
                "decision": [enter_txt, leave_txt, f"Pivote = {fs(pv)} (renglón {r}, columna {names[j]})."],
            })
            iters.append(snapshot(it, title, names, T, basis, extra))
            snap_idx = len(iters) - 1
        ops = pivot(T, basis, r, j)
        if with_steps:
            iters[snap_idx]["ops"] = ops
        it += 1
        if it > MAX_ITERS:
            raise RuntimeError("Se superó el máximo de iteraciones; posible ciclaje.")

    result = {
        "status": status,
        "standard_form": std,
        "columns": names,
        "kinds": kinds,
        "iterations": iters if with_steps else [],
        "n_iterations": it,
        "degenerate_steps": degenerate_steps,
    }

    if status == "unbounded" and std["has_artificial"]:
        # Una dirección no acotada del problema aumentado solo prueba que el original es no acotado
        # si el original es factible. Se verifica la factibilidad (objetivo 0, mismo método).
        p0 = dict(p, c=[F(0)] * n)
        if gran_m(p0, with_steps=False)["status"] == "infeasible":
            result["status"] = "infeasible"
            result["message"] = (
                "El problema no tiene solución factible: las restricciones son contradictorias "
                "(se detectó antes de poder concluir que Z crece sin límite)."
            )
            return result

    if status == "unbounded":
        result["message"] = (
            f"Solución no acotada: {unbounded_var} puede aumentar indefinidamente sin violar "
            f"ninguna restricción y mejora la función objetivo."
        )
        return result

    vals = values_from(T, basis, N)
    bad_art = [(names[b], T[i + 1][-1]) for i, b in enumerate(basis) if kinds[b] == "a" and T[i + 1][-1] > 0]
    if bad_art:
        result["status"] = "infeasible"
        lst = ", ".join(f"{a} = {fs(v)}" for a, v in bad_art)
        result["message"] = (
            "El problema no tiene solución factible: al terminar, la(s) variable(s) artificial(es) "
            f"({lst}) siguen en la base con valor positivo, es decir, las restricciones son contradictorias."
        )
        return result

    z_max = T[0][-1].re
    zero_basic = [names[b] for i, b in enumerate(basis) if T[i + 1][-1] == 0]

    # ¿óptimos múltiples? variable no básica (no artificial) con coeficiente 0 en el renglón (0)
    multiple, alt = False, None
    for j in range(N):
        if j in basis or kinds[j] == "a" or not T[0][j].is_zero():
            continue
        rt = ratio_test(T, j)
        pos = [(i, r) for i, r in rt if r is not None]
        if not pos:
            multiple, alt = True, {"ray": True, "var": names[j]}
            break
        minr = min(r for _, r in pos)
        if minr == 0:
            continue
        T2 = [list(row) for row in T]
        b2 = list(basis)
        rr = min([i for i, r in pos if r == minr], key=lambda i: b2[i - 1])
        pivot(T2, b2, rr, j)
        v2 = values_from(T2, b2, N)
        multiple, alt = True, {"ray": False, "var": names[j], "x": [fs(t) for t in v2[:n]]}
        break

    return finalize(result, p, vals, z_max, [names[b] for b in basis], zero_basic, multiple, alt)


def finalize(result, p, vals, z_max, basis_names, zero_basic, multiple, alt):
    """Cierre común a ambos métodos: solución, holguras/excesos, mensajes."""
    n = p["n"]
    z = z_max if p["sense"] == "max" else -z_max
    x = vals[:n]
    cons_out = []
    for con in p["constraints"]:
        lhs = sum(a * xv for a, xv in zip(con["a"], x))
        if con["op"] == "<=":
            slack = con["b"] - lhs
        elif con["op"] == ">=":
            slack = lhs - con["b"]
        else:
            slack = F(0)
        cons_out.append({
            "lhs": fs(lhs), "op": con["op"], "rhs": fs(con["b"]),
            "slack": fs(slack),
            "kind": {"<=": "holgura", ">=": "exceso", "=": "igualdad"}[con["op"]],
            "binding": slack == 0,
        })
    degenerate = bool(zero_basic)
    result.update({
        "status": "optimal",
        "z": fs(z),
        "x": [{"name": f"x{j+1}", "value": fs(x[j])} for j in range(n)],
        "constraints": cons_out,
        "degenerate": degenerate,
        "zero_basic": zero_basic,
        "multiple": multiple,
        "alt": alt,
        "final_basis": basis_names,
    })
    msgs = ["Solución óptima encontrada."]
    if multiple:
        a1 = "(" + ", ".join(fs(t) for t in x) + ")"
        if alt["ray"]:
            msgs = [f"Soluciones óptimas múltiples: la variable no básica {alt['var']} tiene costo reducido 0 y "
                    f"puede crecer sin límite sin cambiar Z = {fs(z)} (arista óptima no acotada)."]
        else:
            a2 = "(" + ", ".join(alt["x"]) + ")"
            msgs = [f"Soluciones óptimas múltiples: Z = {fs(z)} en todo el segmento entre {a1} y {a2}."]
    if degenerate:
        msgs.append("La solución es degenerada: la variable básica " + ", ".join(zero_basic) + " vale 0.")
    result["message"] = " ".join(msgs)
    return result
