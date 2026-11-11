"""Verificación cruzada (solo para validar, NO se usa en la app): compara contra scipy."""
import os, sys, random
from fractions import Fraction as F
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))
from _solver import solve_problem
from scipy.optimize import linprog

METHOD = sys.argv[1] if len(sys.argv) > 1 else "bigm"
random.seed(7)
bad = 0
counts = {"optimal": 0, "infeasible": 0, "unbounded": 0}
for t in range(1500):
    n, m = random.randint(1, 5), random.randint(1, 5)
    sense = random.choice(["max", "min"])
    c = [random.randint(-6, 9) for _ in range(n)]
    cons = [([random.randint(-4, 7) for _ in range(n)], random.choice(["<=", ">=", "="]), random.randint(-10, 30)) for _ in range(m)]
    r = solve_problem(method=METHOD, raw={"sense": sense, "c": c, "constraints": [{"a": a, "op": o, "b": b} for a, o, b in cons]}, with_steps=False)
    A_ub, b_ub, A_eq, b_eq = [], [], [], []
    for a, o, b in cons:
        if o == "<=": A_ub.append(a); b_ub.append(b)
        elif o == ">=": A_ub.append([-x for x in a]); b_ub.append(-b)
        else: A_eq.append(a); b_eq.append(b)
    cc = c if sense == "min" else [-x for x in c]
    s = linprog(cc, A_ub=A_ub or None, b_ub=b_ub or None, A_eq=A_eq or None, b_eq=b_eq or None, bounds=[(0, None)] * n, method="highs")
    exp = {0: "optimal", 2: "infeasible", 3: "unbounded"}.get(s.status, "other")
    counts[r["status"]] = counts.get(r["status"], 0) + 1
    ok = r["status"] == exp
    if ok and exp == "optimal":
        z = float(F(r["z"])); zs = s.fun if sense == "min" else -s.fun
        ok = abs(z - zs) < 1e-6
    if not ok:
        bad += 1
        if bad <= 5: print("DIFF", sense, c, cons, r["status"], exp, r.get("z"), s.fun)
print(METHOD, "problemas:", 1500, "discrepancias:", bad, counts)
