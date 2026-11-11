import type { ProblemIn } from "../types";

const P = (
  sense: "max" | "min",
  c: number[],
  cons: [number[], "<=" | ">=" | "=", number][],
): ProblemIn => ({
  sense,
  c: c.map(String),
  constraints: cons.map(([a, op, b]) => ({ a: a.map(String), op, b: String(b) })),
});

export const EXAMPLES: { name: string; note: string; problem: ProblemIn }[] = [
  {
    name: "1 · Restricción redundante",
    note: "x₁ = 42, x₂ = 16, Z = 3380",
    problem: P("max", [50, 80], [[[2, 1], "<=", 100], [[1, 3], "<=", 90], [[0, 1], "<=", 40]]),
  },
  {
    name: "2 · Minimizar con =, ≥ y lado derecho negativo",
    note: "x₁ = 2/5, x₂ = 9/5, Z = 17/5",
    problem: P("min", [4, 1], [[[3, 1], "=", 3], [[4, 3], ">=", 6], [[-1, -2], ">=", -4]]),
  },
  {
    name: "3 · Tres variables",
    note: "x = (0, 100, 230), Z = 1350",
    problem: P("max", [3, 2, 5], [[[1, 2, 1], "<=", 430], [[3, 0, 2], "<=", 460], [[1, 4, 0], "<=", 420]]),
  },
  {
    name: "4 · Infactible",
    note: "Sin solución factible",
    problem: P("max", [1, 1], [[[1, 1], "<=", 2], [[1, 1], ">=", 5]]),
  },
  {
    name: "5 · No acotado",
    note: "Z crece sin límite",
    problem: P("max", [1, 1], [[[1, -1], "<=", 1], [[-1, 1], "<=", 2]]),
  },
  {
    name: "6 · Óptimos múltiples",
    note: "Z = 10 en un segmento",
    problem: P("max", [2, 4], [[[1, 2], "<=", 5], [[1, 1], "<=", 4]]),
  },
  {
    name: "7 · Degenerado",
    note: "x = (0, 2), Z = 18, una básica en 0",
    problem: P("max", [3, 9], [[[1, 4], "<=", 8], [[1, 2], "<=", 4]]),
  },
  {
    name: "Wyndor Glass (clase)",
    note: "x = (2, 6), Z = 36",
    problem: P("max", [3, 5], [[[1, 0], "<=", 4], [[0, 2], "<=", 12], [[3, 2], "<=", 18]]),
  },
];

export const EMPTY_PROBLEM: ProblemIn = EXAMPLES[7].problem;
