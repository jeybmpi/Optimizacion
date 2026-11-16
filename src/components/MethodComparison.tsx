import { useEffect, useState } from "react";
import type { Cell, Iteration, NumMode, ProblemIn, SolveResult } from "../types";
import { solve } from "../lib/api";
import { Frac } from "../lib/sensitivity";
import { cellText, num } from "../lib/numfmt";

type Pair = { bigm: SolveResult; revised: SolveResult };

const neg = (c: Cell): Cell => [new Frac(0n).sub(Frac.parse(c[0])).toString(), new Frac(0n).sub(Frac.parse(c[1])).toString()];

/** Valor de Z (en la escala original del problema) al inicio de cada iteración, según el método. */
function zOf(it: Iteration, sense: "max" | "min" | undefined): Cell | null {
  let c: Cell | null = null;
  if (it.rows && it.rows.length > 0) c = it.rows[0][it.rows[0].length - 1];
  else if (it.z) c = it.z;
  if (!c) return null;
  return sense === "min" ? neg(c) : c;
}

/** Iteraciones comparables: se omite el paso preparatorio (k < 0) que solo existe en Gran M. */
const core = (r: SolveResult) => (r.iterations ?? []).filter((it) => it.k >= 0);

export default function MethodComparison({ problem, mode }: { problem: ProblemIn; mode: NumMode }) {
  const [pair, setPair] = useState<Pair | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPair(null);
    Promise.all([solve(problem, true, "bigm"), solve(problem, true, "revised")]).then(([bigm, revised]) => {
      if (!cancelled) setPair({ bigm, revised });
    });
    return () => {
      cancelled = true;
    };
  }, [problem]);

  if (!pair) {
    return (
      <div className="empty">
        <span className="lab mute">Comparación</span>
        <h2>Gran M vs simplex revisado</h2>
        <p>Calculando ambos métodos…</p>
      </div>
    );
  }

  const { bigm, revised } = pair;
  if (bigm.status === "error" || revised.status === "error" || bigm.status === "invalid" || revised.status === "invalid") {
    return (
      <div className="empty">
        <h2>Comparación no disponible</h2>
        <p>{bigm.message ?? revised.message ?? "No se pudo resolver el problema con ambos métodos."}</p>
      </div>
    );
  }

  const a = core(bigm);
  const b = core(revised);
  const rows = Math.max(a.length, b.length);
  const prep = (bigm.iterations ?? []).filter((it) => it.k < 0).length;

  const sameStatus = bigm.status === revised.status;
  const sameZ = bigm.z === revised.z;
  const sameX =
    (bigm.x ?? []).length === (revised.x ?? []).length &&
    (bigm.x ?? []).every((v, i) => v.value === revised.x?.[i]?.value);
  const sameRoute =
    a.length === b.length &&
    a.every((it, i) => it.entering?.name === b[i].entering?.name && it.leaving?.name === b[i].leaving?.name);
  const agree = sameStatus && (bigm.status !== "optimal" || (sameZ && sameX));

  // tamaño de lo que se actualiza en cada iteración
  const bm = a[0]?.rows ? `${a[0].rows.length} × ${a[0].rows[0].length} (tablero completo)` : "—";
  const rv = b[0]?.binv ? `${b[0].binv.length} × ${b[0].binv.length} (B⁻¹) + y, z̄ⱼ − cⱼ` : "—";

  const statusText: Record<string, string> = {
    optimal: "Óptimo",
    infeasible: "Infactible",
    unbounded: "No acotado",
  };

  const step = (it: Iteration | undefined) => {
    if (!it) return { enter: "—", leave: "—", pivot: "—", z: "—" };
    const z = zOf(it, bigm.sense);
    return {
      enter: it.entering?.name ?? "óptimo",
      leave: it.leaving?.name ?? "—",
      pivot: it.pivot ? num(it.pivot.value, mode) : "—",
      z: z ? cellText(z, mode) : "—",
    };
  };

  return (
    <div className="steps">
      <div className={"banner " + (agree ? "ok" : "bad")} role="status">
        <strong>{agree ? "Los dos métodos coinciden" : "Los métodos NO coinciden"}</strong>
        <p style={{ margin: "4px 0 0" }}>
          {bigm.status === "optimal"
            ? `Ambos llegan a Z* = ${num(String(bigm.z), mode)} con las mismas variables. ${
                sameRoute
                  ? "Además recorren exactamente los mismos vértices (misma variable entrante y saliente en cada iteración)."
                  : "Pero siguen caminos distintos (cambia alguna variable entrante o saliente)."
              }`
            : `Ambos concluyen: ${statusText[bigm.status] ?? bigm.status}.`}
        </p>
      </div>

      <section className="block">
        <span className="lab mute">Resumen</span>
        <h3>Gran M vs simplex revisado</h3>
        <div className="tab-scroll">
          <table className="plain">
            <thead>
              <tr>
                <th></th>
                <th>Gran M (tablero)</th>
                <th>Simplex revisado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Resultado</th>
                <td>{statusText[bigm.status] ?? bigm.status}</td>
                <td>{statusText[revised.status] ?? revised.status}</td>
              </tr>
              <tr>
                <th scope="row">Z*</th>
                <td>{bigm.z !== undefined ? num(String(bigm.z), mode) : "—"}</td>
                <td>{revised.z !== undefined ? num(String(revised.z), mode) : "—"}</td>
              </tr>
              <tr>
                <th scope="row">Solución x*</th>
                <td>{(bigm.x ?? []).map((v) => `${v.name}=${num(v.value, mode)}`).join(", ") || "—"}</td>
                <td>{(revised.x ?? []).map((v) => `${v.name}=${num(v.value, mode)}`).join(", ") || "—"}</td>
              </tr>
              <tr>
                <th scope="row">Iteraciones</th>
                <td>{bigm.n_iterations ?? a.length}</td>
                <td>{revised.n_iterations ?? b.length}</td>
              </tr>
              <tr>
                <th scope="row">Paso previo (eliminar M del renglón 0)</th>
                <td>{prep > 0 ? "Sí" : "No hace falta"}</td>
                <td>No (usa c_B B⁻¹ directamente)</td>
              </tr>
              <tr>
                <th scope="row">Lo que se actualiza por iteración</th>
                <td>{bm}</td>
                <td>{rv}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="block">
        <span className="lab mute">Iteración por iteración</span>
        <h3>Pivoteo en cada método</h3>
        <p className="hint" style={{ marginTop: 0 }}>
          Z se muestra en la escala original del problema (con M simbólica mientras haya artificiales en la base).
        </p>
        <div className="tab-scroll">
          <table className="plain">
            <thead>
              <tr>
                <th rowSpan={2}>k</th>
                <th colSpan={4}>Gran M</th>
                <th colSpan={4}>Simplex revisado</th>
                <th rowSpan={2}>¿Igual?</th>
              </tr>
              <tr>
                <th>Entra</th>
                <th>Sale</th>
                <th>Pivote</th>
                <th>Z</th>
                <th>Entra</th>
                <th>Sale</th>
                <th>Pivote</th>
                <th>Z</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, i) => {
                const s1 = step(a[i]);
                const s2 = step(b[i]);
                const same = s1.enter === s2.enter && s1.leave === s2.leave && s1.z === s2.z;
                return (
                  <tr key={i}>
                    <th scope="row">{i}</th>
                    <td>{s1.enter}</td>
                    <td>{s1.leave}</td>
                    <td>{s1.pivot}</td>
                    <td>{s1.z}</td>
                    <td>{s2.enter}</td>
                    <td>{s2.leave}</td>
                    <td>{s2.pivot}</td>
                    <td>{s2.z}</td>
                    <td>{same ? "✓" : "≠"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="hint">
          Con la misma regla de entrada (el costo reducido más negativo) y la misma prueba de la razón mínima, los dos
          métodos hacen los mismos pivoteos: cambia <em>cómo</em> se calculan los números. Gran M actualiza todo el
          tablero con operaciones de renglón; el simplex revisado solo mantiene B⁻¹ y recalcula, cuando hace falta,
          los costos reducidos z̄ⱼ − cⱼ = c_B B⁻¹ Aⱼ − cⱼ y la columna entrante B⁻¹ Aⱼ.
        </p>
      </section>
    </div>
  );
}
