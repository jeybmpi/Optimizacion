import { useMemo } from "react";
import type { NumMode, ProblemIn, SolveResult } from "../types";
import { computeSensitivity } from "../lib/sensitivity";
import { num } from "../lib/numfmt";

const sym = { "<=": "≤", ">=": "≥", "=": "=" } as const;

export default function Sensitivity({
  problem,
  result,
  mode,
}: {
  problem: ProblemIn;
  result: SolveResult;
  mode: NumMode;
}) {
  const report = useMemo(() => computeSensitivity(problem, result), [problem, result]);

  if (result.status !== "optimal" || !report) {
    return (
      <div className="empty">
        <span className="lab mute">Post-optimalidad</span>
        <h2>Análisis de sensibilidad</h2>
        <p>
          El análisis de sensibilidad requiere una solución óptima finita. Estado actual:{" "}
          <strong>{result.status}</strong>.
        </p>
      </div>
    );
  }

  const fmtBound = (v: string | null, inf: string) => (v === null ? inf : num(v, mode));

  return (
    <div className="steps">
      {/* 1. Precios sombra y rangos de factibilidad (Lado derecho b_i) */}
      <section className="block">
        <span className="lab mute">Dualidad · Lados derechos (bᵢ)</span>
        <h3>1. Precios sombra e intervalos de factibilidad</h3>
        <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
          El <strong>precio sombra (yᵢ)</strong> indica cuánto mejora Z por cada unidad adicional en el recurso bᵢ,
          mientras bᵢ permanezca dentro del intervalo de factibilidad [bᵢ mín, bᵢ máx] (la base actual se mantiene
          factible: B⁻¹b ≥ 0).
        </p>
        <div className="tab-scroll">
          <table className="plain">
            <thead>
              <tr>
                <th>Restricción</th>
                <th>Estado</th>
                <th>Holgura / Exceso</th>
                <th>Precio sombra (yᵢ)</th>
                <th>bᵢ actual</th>
                <th>Intervalo [bᵢ mín, bᵢ máx]</th>
                <th>Cambio permitido [−Δ, +Δ]</th>
              </tr>
            </thead>
            <tbody>
              {report.constraints.map((c) => (
                <tr key={c.name}>
                  <th scope="row">
                    {c.name} ({sym[c.op]})
                  </th>
                  <td>
                    <span className={"pill " + (c.binding ? "on" : "off")}>
                      {c.binding ? "Activa" : "Con margen"}
                    </span>
                  </td>
                  <td>{c.op === "=" ? "—" : num(c.slackValue, mode)}</td>
                  <td>
                    <strong>{num(c.shadowPrice, mode)}</strong>
                  </td>
                  <td>{num(c.originalB, mode)}</td>
                  <td>
                    [{fmtBound(c.bMin, "−∞")}, {fmtBound(c.bMax, "+∞")}]
                  </td>
                  <td>
                    [−{fmtBound(c.allowableDec, "∞")}, +{fmtBound(c.allowableInc, "∞")}]
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Costos reducidos y rangos de optimalidad (Coeficientes c_j) */}
      <section className="block">
        <span className="lab mute">Optimalidad · Coeficientes objetivo (cⱼ)</span>
        <h3>2. Costos reducidos e intervalos de optimalidad</h3>
        <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
          El <strong>intervalo de optimalidad [cⱼ mín, cⱼ máx]</strong> muestra cuánto puede variar el coeficiente cⱼ en
          Z sin que cambie el vértice óptimo actual (todos los costos reducidos mantienen su signo óptimo).
        </p>
        <div className="tab-scroll">
          <table className="plain">
            <thead>
              <tr>
                <th>Variable</th>
                <th>Base</th>
                <th>Valor óptimo (xⱼ*)</th>
                <th>Costo reducido</th>
                <th>cⱼ actual</th>
                <th>Intervalo [cⱼ mín, cⱼ máx]</th>
                <th>Cambio permitido [−Δ, +Δ]</th>
              </tr>
            </thead>
            <tbody>
              {report.variables.map((v) => (
                <tr key={v.name}>
                  <th scope="row">{v.name}</th>
                  <td>
                    <span className={"pill " + (v.isBasic ? "on" : "off")}>
                      {v.isBasic ? "Básica" : "No básica"}
                    </span>
                  </td>
                  <td>{num(v.optValue, mode)}</td>
                  <td>{num(v.reducedCost, mode)}</td>
                  <td>{num(v.originalC, mode)}</td>
                  <td>
                    [{fmtBound(v.cMin, "−∞")}, {fmtBound(v.cMax, "+∞")}]
                  </td>
                  <td>
                    [−{fmtBound(v.allowableDec, "∞")}, +{fmtBound(v.allowableInc, "∞")}]
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Interpretación y Matriz B^-1 final */}
      <div className="two">
        <section className="block">
          <span className="lab mute">Lectura ejecutiva</span>
          <h3>3. Interpretación automática</h3>
          <ul className="decision" style={{ marginTop: 6 }}>
            {report.constraints.map((c) => (
              <li key={c.name}>
                <strong>{c.name}:</strong>{" "}
                {c.binding
                  ? `Es una restricción activa (sin margen). Cada unidad adicional en b${c.index} cambia Z en ${num(c.shadowPrice, mode)} unidades, válido en [${fmtBound(c.bMin, "−∞")}, ${fmtBound(c.bMax, "+∞")}].`
                  : `Tiene margen disponible (${num(c.slackValue, mode)} unidades), por lo que su precio sombra es ${num(c.shadowPrice, mode)}.`}
              </li>
            ))}
          </ul>
        </section>

        <section className="block">
          <span className="lab mute">Base óptima B = ({report.basisNames.join(", ")})</span>
          <h3>Matriz inversa B⁻¹ en el óptimo</h3>
          <div className="tab-scroll">
            <table className="tableau compact">
              <thead>
                <tr>
                  <th>Básica</th>
                  {report.binv.map((_, k) => (
                    <th key={k}>R{k + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.binv.map((row, i) => (
                  <tr key={i}>
                    <th scope="row" className="vb">
                      {report.basisNames[i]}
                    </th>
                    {row.map((val, k) => (
                      <td key={k}>{num(val, mode)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
