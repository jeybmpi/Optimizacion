import os, sys
from fractions import Fraction as F
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))
import pytest
from _solver import solve_problem as _solve

METHOD = "bigm"


@pytest.fixture(params=["bigm", "revised"], autouse=True)
def _method(request):
    global METHOD
    METHOD = request.param


def solve_problem(raw, with_steps=True):
    return _solve(raw, with_steps=with_steps, method=METHOD)


def P(sense, c, cons):
    return {"sense": sense, "c": c, "constraints": [{"a": a, "op": op, "b": b} for a, op, b in cons]}


def vals(r):
    return [F(v["value"]) for v in r["x"]]


def test_1_estandar():
    r = solve_problem(P("max", [50, 80], [([2, 1], "<=", 100), ([1, 3], "<=", 90), ([0, 1], "<=", 40)]))
    assert r["status"] == "optimal" and vals(r) == [42, 16] and F(r["z"]) == 3380


def test_2_min_artificiales():
    r = solve_problem(P("min", [4, 1], [([3, 1], "=", 3), ([4, 3], ">=", 6), ([-1, -2], ">=", -4)]))
    assert r["status"] == "optimal" and vals(r) == [F(2, 5), F(9, 5)] and F(r["z"]) == F(17, 5)


def test_3_tres_variables():
    r = solve_problem(P("max", [3, 2, 5], [([1, 2, 1], "<=", 430), ([3, 0, 2], "<=", 460), ([1, 4, 0], "<=", 420)]))
    assert r["status"] == "optimal" and vals(r) == [0, 100, 230] and F(r["z"]) == 1350


def test_4_infactible():
    r = solve_problem(P("max", [1, 1], [([1, 1], "<=", 2), ([1, 1], ">=", 5)]))
    assert r["status"] == "infeasible" and "no tiene solución factible" in r["message"]


def test_5_no_acotado():
    r = solve_problem(P("max", [1, 1], [([1, -1], "<=", 1), ([-1, 1], "<=", 2)]))
    assert r["status"] == "unbounded"


def test_6_multiples():
    r = solve_problem(P("max", [2, 4], [([1, 2], "<=", 5), ([1, 1], "<=", 4)]))
    assert r["status"] == "optimal" and r["multiple"] and F(r["z"]) == 10
    pts = {tuple(vals(r)), tuple(F(t) for t in r["alt"]["x"])}
    assert pts == {(0, F(5, 2)), (3, 1)}


def test_7_degenerado():
    r = solve_problem(P("max", [3, 9], [([1, 4], "<=", 8), ([1, 2], "<=", 4)]))
    assert r["status"] == "optimal" and vals(r) == [0, 2] and F(r["z"]) == 18 and r["degenerate"]
    assert not r["multiple"]


def test_holguras_y_exceso():
    r = solve_problem(P("max", [50, 80], [([2, 1], "<=", 100), ([1, 3], "<=", 90), ([0, 1], "<=", 40)]))
    sl = [F(c["slack"]) for c in r["constraints"]]
    assert sl == [0, 0, 24]  # x2 <= 40 es redundante (16 < 40)


def test_validacion():
    assert solve_problem({"sense": "max", "c": ["a"], "constraints": [{"a": [1], "op": "<=", "b": 1}]})["status"] == "invalid"
    assert solve_problem({"sense": "max", "c": [1, 2], "constraints": [{"a": [1], "op": "<=", "b": 1}]})["status"] == "invalid"
    assert solve_problem({"sense": "max", "c": [1], "constraints": [{"a": [1], "op": "<=", "b": ""}]})["status"] == "invalid"
    assert solve_problem({"sense": "max", "c": [1], "constraints": [{"a": [1], "op": "<", "b": 1}]})["status"] == "invalid"
    assert solve_problem({"sense": "foo", "c": [1], "constraints": []})["status"] == "invalid"


def test_decimales_y_fracciones_de_entrada():
    r = solve_problem(P("max", ["0.5", "1/3"], [(["1", "1"], "<=", "6")]))
    assert r["status"] == "optimal" and F(r["z"]) == 3


def test_pasos_presentes():
    r = solve_problem(P("max", [50, 80], [([2, 1], "<=", 100), ([1, 3], "<=", 90), ([0, 1], "<=", 40)]))
    it = r["iterations"]
    assert len(it) == r["n_iterations"] + 1
    assert it[0]["entering"]["name"] == "x2" and it[0]["leaving"]["name"] == "s2"
    assert solve_problem(P("max", [1], [([1], "<=", 1)]), with_steps=False)["iterations"] == []


def test_infactible_con_direccion_no_acotada():
    # Antes se reportaba 'unbounded' porque aparecía una dirección de crecimiento con artificiales > 0
    r = solve_problem(P("max", [6], [([0], "<=", 28), ([-4], "<=", 24), ([0], ">=", 7)]))
    assert r["status"] == "infeasible"


def test_no_acotado_con_artificiales_pero_factible():
    r = solve_problem(P("min", [-1, -3, 5, -5], [([-1, 5, -4, -2], "<=", 8), ([3, 6, 1, -4], "<=", 5),
                                                ([3, 0, 7, 3], ">=", 14), ([-3, -1, -2, 1], "<=", 12)]))
    assert r["status"] == "unbounded"


def test_ambos_metodos_dan_lo_mismo():
    probs = [P("max", [50, 80], [([2, 1], "<=", 100), ([1, 3], "<=", 90), ([0, 1], "<=", 40)]),
             P("min", [4, 1], [([3, 1], "=", 3), ([4, 3], ">=", 6), ([-1, -2], ">=", -4)])]
    for pr in probs:
        a, b = _solve(pr, method="bigm"), _solve(pr, method="revised")
        assert a["z"] == b["z"] and a["x"] == b["x"]
        assert a["n_iterations"] == b["n_iterations"]


def test_revisado_muestra_binv_y_costos_reducidos():
    r = _solve(P("max", [50, 80], [([2, 1], "<=", 100), ([1, 3], "<=", 90), ([0, 1], "<=", 40)]), method="revised")
    first = r["iterations"][0]
    assert first["binv"] == [["1", "0", "0"], ["0", "1", "0"], ["0", "0", "1"]]
    assert first["entering"]["name"] == "x2" and first["leaving"]["name"] == "s2"
    assert {c["name"] for c in first["rc"]} == {"x1", "x2"}


def test_metodo_invalido():
    assert _solve(P("max", [1], [([1], "<=", 1)]), method="zzz")["status"] == "invalid"
