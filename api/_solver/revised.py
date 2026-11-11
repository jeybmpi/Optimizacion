"""Simplex revisado (Clase 11) con aritmética exacta y costos M simbólicos.

Se mantiene explícitamente B⁻¹. En cada iteración:
  x_B = B⁻¹ b ;  y = c_B B⁻¹ ;  z_j − c_j = y·A_j − c_j ;  d = B⁻¹ A_entrante ;  razón = x_B / d
Las restricciones ≥ y = se manejan con artificiales de costo −M, igual que en la Gran M,
pero sin construir el tablero completo.
"""
from fractions import Fraction as F

from .bigm import build, finalize
from .fmt import cell, fs, mtext
from .mnum import MNum, msign

MAX_ITERS = 500
BLAND_AFTER = 100


def _dot(y, col):
    acc = MNum()
    for yi, a in zip(y, col):
        acc = acc + yi * a
    return acc


def simplex_revised(p, with_steps=True):
    names, kinds, A, row0, basis, rows, std = build(p)
    n, m, N = p["n"], p["m"], len(names)
    Af = [r[:-1] for r in A]
    b = [r[-1] for r in A]
    cost = [-v for v in row0[:N]]  # costos de la forma de maximización (artificiales: −M)
    basis = list(basis)
    Binv = [[F(1) if i == k else F(0) for k in range(m)] for i in range(m)]
    col = lambda j: [Af[i][j] for i in range(m)]  # noqa: E731

    def state():
        xB = [sum((Binv[i][k] * b[k] for k in range(m)), F(0)) for i in range(m)]
        cB = [cost[j] for j in basis]
        y = []
        for k in range(m):
            acc = MNum()
            for i in range(m):
                acc = acc + cB[i] * Binv[i][k]
            y.append(acc)
        z = MNum()
        for i in range(m):
            z = z + cB[i] * xB[i]
        rc = {j: _dot(y, col(j)) - cost[j] for j in range(N) if j not in basis}
        return xB, y, z, rc

    iters, degenerate_steps = [], []
    it = 0
    status = None
    unbounded_var = None
    while True:
        xB, y, z, rc = state()
        cands = [j for j in rc if kinds[j] != "a" and msign(rc[j]) < 0]
        title = "Iteración 0 (base inicial)" if it == 0 else f"Iteración {it}"
        snap = None
        if with_steps:
            snap = {
                "k": it, "title": title, "method": "revised",
                "basis": [names[j] for j in basis],
                "binv": [[fs(v) for v in row] for row in Binv],
                "xb": [fs(v) for v in xB],
                "y": [cell(v) for v in y],
                "rc": [{"name": names[j], "value": cell(rc[j])} for j in sorted(rc)],
                "z": cell(z),
            }
        if not cands:
            if snap:
                snap["title"] = title + " — óptimo"
                snap["decision"] = ["Todos los costos reducidos (z_j − c_j) de las variables no básicas son ≥ 0: solución óptima."]
                iters.append(snap)
            status = "optimal"
            break

        if it > BLAND_AFTER:
            j, rule = min(cands), "regla de Bland (índice menor) para evitar ciclos"
        else:
            j, rule = min(cands, key=lambda c: (rc[c], c)), "el costo reducido más negativo"
        ties = [c for c in cands if rc[c] == rc[j] and c != j]
        d = [sum((Binv[i][k] * Af[k][j] for k in range(m)), F(0)) for i in range(m)]
        pos = [(i, xB[i] / d[i]) for i in range(m) if d[i] > 0]
        enter_txt = f"Entra {names[j]}: {rule} (z − c = {mtext(rc[j])})."
        if ties and it <= BLAND_AFTER:
            enter_txt += " Empate con " + ", ".join(names[c] for c in ties) + "; se eligió el de menor índice."

        if not pos:
            if snap:
                snap.update({
                    "title": title + " — no acotado",
                    "entering": {"col": j, "name": names[j]},
                    "d": [fs(v) for v in d],
                    "ratios": [{"row": i + 1, "basic": names[basis[i]], "num": fs(xB[i]), "den": None, "ratio": None} for i in range(m)],
                    "decision": [enter_txt, f"d = B⁻¹·A_{names[j]} no tiene componentes positivas: no hay razón mínima."],
                })
                iters.append(snap)
            status, unbounded_var = "unbounded", names[j]
            break

        minr = min(r for _, r in pos)
        tied = [i for i, r in pos if r == minr]
        r = min(tied, key=lambda i: basis[i])
        leave_txt = f"Sale {names[basis[r]]}: razón mínima = {fs(minr)} (renglón {r+1})."
        if len(tied) > 1:
            leave_txt += (" Empate entre " + ", ".join(names[basis[i]] for i in tied)
                          + ": la solución será degenerada.")
            degenerate_steps.append(it)
        elif minr == 0:
            leave_txt += " La razón mínima es 0: paso degenerado (Z no mejora)."
            degenerate_steps.append(it)
        if snap:
            snap.update({
                "entering": {"col": j, "name": names[j], "value": cell(rc[j])},
                "d": [fs(v) for v in d],
                "ratios": [
                    {"row": i + 1, "basic": names[basis[i]], "num": fs(xB[i]),
                     "den": fs(d[i]) if d[i] > 0 else None,
                     "ratio": fs(xB[i] / d[i]) if d[i] > 0 else None}
                    for i in range(m)
                ],
                "leaving": {"row": r + 1, "name": names[basis[r]]},
                "pivot": {"row": r + 1, "col": j, "value": fs(d[r])},
                "decision": [enter_txt, leave_txt,
                             f"Pivote d_{r+1} = {fs(d[r])}. Se actualiza B⁻¹ con operaciones de renglón sobre [B⁻¹ | d]."],
            })
            iters.append(snap)
        pv = d[r]
        Binv[r] = [v / pv for v in Binv[r]]
        for i in range(m):
            if i != r and d[i] != 0:
                Binv[i] = [a - d[i] * bb for a, bb in zip(Binv[i], Binv[r])]
        basis[r] = j
        it += 1
        if it > MAX_ITERS:
            raise RuntimeError("Se superó el máximo de iteraciones; posible ciclaje.")

    result = {
        "status": status, "standard_form": std, "columns": names, "kinds": kinds,
        "iterations": iters if with_steps else [], "n_iterations": it,
        "degenerate_steps": degenerate_steps,
    }

    if status == "unbounded" and std["has_artificial"]:
        if simplex_revised(dict(p, c=[F(0)] * n), with_steps=False)["status"] == "infeasible":
            result["status"] = "infeasible"
            result["message"] = ("El problema no tiene solución factible: las restricciones son contradictorias "
                                 "(se detectó antes de poder concluir que Z crece sin límite).")
            return result
    if status == "unbounded":
        result["message"] = (f"Solución no acotada: {unbounded_var} puede aumentar indefinidamente sin violar "
                             f"ninguna restricción y mejora la función objetivo.")
        return result

    vals = [F(0)] * N
    for i, j in enumerate(basis):
        vals[j] = xB[i]
    bad = [(names[j], xB[i]) for i, j in enumerate(basis) if kinds[j] == "a" and xB[i] > 0]
    if bad:
        result["status"] = "infeasible"
        lst = ", ".join(f"{a} = {fs(v)}" for a, v in bad)
        result["message"] = ("El problema no tiene solución factible: al terminar, la(s) variable(s) artificial(es) "
                             f"({lst}) siguen en la base con valor positivo, es decir, las restricciones son contradictorias.")
        return result

    zero_basic = [names[j] for i, j in enumerate(basis) if xB[i] == 0]
    multiple, alt = False, None
    for j in range(N):
        if j in basis or kinds[j] == "a" or not rc[j].is_zero():
            continue
        d = [sum((Binv[i][k] * Af[k][j] for k in range(m)), F(0)) for i in range(m)]
        pos = [(i, xB[i] / d[i]) for i in range(m) if d[i] > 0]
        if not pos:
            multiple, alt = True, {"ray": True, "var": names[j]}
            break
        theta = min(r for _, r in pos)
        if theta == 0:
            continue
        v2 = [F(0)] * N
        for i, bj in enumerate(basis):
            v2[bj] = xB[i] - theta * d[i]
        v2[j] = theta
        multiple, alt = True, {"ray": False, "var": names[j], "x": [fs(t) for t in v2[:n]]}
        break

    return finalize(result, p, vals, z.re, [names[j] for j in basis], zero_basic, multiple, alt)
