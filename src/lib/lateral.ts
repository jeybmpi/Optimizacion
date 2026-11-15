import { solve } from "./api";
import { Frac } from "./sensitivity";
import type { ConSensitivity } from "./sensitivity";
import type { ProblemIn, SolveResult } from "../types";

/** Variación de Z por unidad de bᵢ medida hacia cada lado (null = el problema deja de ser óptimo finito). */
export interface Lateral {
  up: string | null;
  down: string | null;
}

const DELTA = new Frac(1n, 1000n);

/**
 * ¿Un extremo del intervalo de bᵢ coincide con el bᵢ actual (Δ = 0 de ese lado)?
 * Ocurre exactamente cuando una variable básica vale 0 (degeneración) y depende de esa restricción:
 * entonces la base solo es válida de un lado y el precio sombra (yᵢ = c_B B⁻¹ eᵢ) no es la pendiente real del otro.
 */
export function isOneSided(c: ConSensitivity): boolean {
  const b = Frac.parse(c.originalB);
  const hit = (v: string | null) => v !== null && Frac.parse(v).sub(b).isZero();
  return hit(c.bMin) || hit(c.bMax);
}

/**
 * Pendientes laterales de Z respecto a bᵢ, calculadas re-resolviendo con nuestro propio solver
 * en bᵢ ± 0.001 (aritmética exacta, sin librerías externas). Solo se usa en filas con precio sombra no único.
 */
export async function lateralShadowPrices(
  problem: ProblemIn,
  result: SolveResult,
  rows: ConSensitivity[],
): Promise<Record<number, Lateral>> {
  const z0 = Frac.parse(String(result.z));
  const out: Record<number, Lateral> = {};
  for (const row of rows) {
    const b0 = Frac.parse(row.originalB);
    const side = async (sign: 1 | -1): Promise<string | null> => {
      const q = structuredClone(problem);
      const bNew = sign > 0 ? b0.add(DELTA) : b0.sub(DELTA);
      q.constraints[row.index - 1].b = bNew.toString();
      const r = await solve(q, false, "bigm");
      if (r.status !== "optimal") return null;
      const z1 = Frac.parse(String(r.z));
      return (sign > 0 ? z1.sub(z0) : z0.sub(z1)).div(DELTA).toString();
    };
    out[row.index] = { up: await side(1), down: await side(-1) };
  }
  return out;
}
