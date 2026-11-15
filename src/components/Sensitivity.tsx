import { useEffect, useMemo, useState } from "react";
import type { NumMode, ProblemIn, SolveResult } from "../types";
import { computeSensitivity } from "../lib/sensitivity";
import { num } from "../lib/numfmt";
import { isOneSided, lateralShadowPrices, type Lateral } from "../lib/lateral";

const Frac0 = (v: string) => Number(v.split("/")[0]) === 0;
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

  // Filas con precio sombra no único (variable básica en 0): se calculan las pendientes reales por cada lado.
  const [lateral, setLateral] = useState<Record<number, Lateral> | null>(null);
  const oneSidedRows = useMemo(() => (report ? report.constraints.filter(isOneSided) : []), [report]);
  useEffect(() => {
    let cancelled = false;
    setLateral(null);
    if (!report || oneSidedRows.length === 0) return;
    lateralShadowPrices(problem, result, oneSidedRows)
      .then((l) => !cancelled && setLateral(l))
      .catch(() => !cancelled && setLateral({}));
    return () => {
      cancelled = true;
    };
  }, [problem, result, report, oneSidedRows]);

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
      {(result.degenerate || result.multiple) && (
        <div className="banner warn" role="status">
          <strong>Interpreta estos resultados con cuidado</strong>
          <ul>
            {result.degenerate && (
              <li>
                La solución es <strong>degenerada</strong> ({(result.zero_basic ?? []).join(", ") || "una variable básica"}{" "}
                vale 0). Un extremo del intervalo de bᵢ coincide con el valor actual y el precio sombra{" "}
                <strong>no es único</strong>: solo vale hacia un lado. En las filas marcadas con ⚠ se muestra la
                variación real de Z hacia cada lado (re-resolviendo con bᵢ ± 0.001).
              </li>
            )}
            {result.multiple && (
              <li>
                Hay <strong>óptimos múltiples</strong>: otra solución da el mismo Z
                {result.alt?.x ? (
                  <>
                    {" "}
                    (al entrar <strong>{result.alt.var}</strong>: x = ({result.alt.x.map((v) => num(v, mode)).join(", ")}))
                  </>
                ) : result.alt?.ray ? (
                  <> (hay un rayo óptimo al entrar {result.alt.var}: la región es no acotada en esa dirección)</>
                ) : null}
                . Todos los puntos del segmento entre ambas soluciones son óptimos. Las variables no básicas con costo
                reducido 0 (marcadas con ⚠) son la señal; los rangos de cⱼ y bᵢ corresponden a la base final
                encontrada y otra base óptima tendría rangos distintos.
              </li>
            )}
          </ul>
        </div>
      )}

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
                    {isOneSided(c) && (
                      <div style={{ marginTop: 4 }}>
                        <span className="pill warn" title="Variable básica en 0: el precio sombra solo vale hacia un lado">
                          ⚠ no único
                        </span>
                        <div className="hint" style={{ margin: "4px 0 0" }}>
                          {lateral === null ? (
                            "calculando pendientes…"
                          ) : lateral[c.index] ? (
                            <>
                              ↑ subir bᵢ: ΔZ/Δb = <strong>{lateral[c.index].up === null ? "—" : num(lateral[c.index].up!, mode)}</strong>
                              <br />↓ bajar bᵢ: ΔZ/Δb = <strong>{lateral[c.index].down === null ? "—" : num(lateral[c.index].down!, mode)}</strong>
                            </>
                          ) : (
                            "no disponible"
                          )}
                        </div>
                      </div>
                    )}
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
                <th>Costo reducido (empeora Z)</th>
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
                  <td>
                    {num(v.reducedCost, mode)}
                    {!v.isBasic && Frac0(v.reducedCost) && (
                      <div style={{ marginTop: 4 }}>
                        <span className="pill warn" title="Costo reducido 0: entrar a la base no cambia Z (óptimo alternativo)">
                          ⚠ óptimo alternativo
                        </span>
                      </div>
                    )}
                  </td>
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
            {report.variables.map((v) => {
              const lo = fmtBound(v.cMin, "−∞");
              const hi = fmtBound(v.cMax, "+∞");
              const rng = `mientras c${v.name.slice(1)} esté en [${lo}, ${hi}] el vértice óptimo no cambia (Z sí cambia, porque cₓ·x varía).`;
              return (
                <li key={v.name}>
                  <strong>{v.name}:</strong>{" "}
                  {v.isBasic
                    ? `es básica con valor ${num(v.optValue, mode)}; ${rng}`
                    : v.reducedCost !== "0"
                      ? `vale 0. Su costo reducido es ${num(v.reducedCost, mode)}: producir una unidad de ${v.name} empeoraría Z en esa cantidad; ${rng}`
                      : `vale 0 pero su costo reducido es 0: puede entrar a la base sin cambiar Z (señal de óptimos múltiples); ${rng}`}
                </li>
              );
            })}
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
