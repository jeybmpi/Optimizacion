import type { NumMode, SolveResult } from "../types";
import Tableau from "./Tableau";
import RevisedSteps from "./RevisedSteps";

export default function StepByStep({ result, mode }: { result: SolveResult; mode: NumMode }) {
  const sf = result.standard_form;
  const its = result.iterations ?? [];
  if (!sf) return null;

  return (
    <div className="steps">
      <section className="block">
        <h3>1. Forma estándar aumentada</h3>
        <p className="hint" style={{ marginTop: 0 }}>Método: {result.method === "revised" ? "simplex revisado (con B⁻¹)" : "Gran M (tablero simplex)"}.</p>
        <p className="mono-line">{sf.original_objective}</p>
        {sf.notes.length > 0 && (
          <ul className="notes">
            {sf.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
        <div className="equations">
          <div className="mono-line strong">{sf.objective}</div>
          <div className="mono-line">{sf.equation0}</div>
          {sf.equations.map((e, i) => (
            <div className="mono-line" key={i}>
              ({i + 1}) {e}
            </div>
          ))}
          <div className="mono-line muted">todas las variables ≥ 0</div>
        </div>
        {sf.has_artificial && (
          <p className="hint">
            M es un número positivo muy grande: se maneja de forma simbólica (exacta), nunca se reemplaza por un valor
            numérico. Se comparan primero los coeficientes de M y después la parte restante.
          </p>
        )}
      </section>

      <section className="block legend-block">
        <h3>2. Iteraciones</h3>
        <div className="legend" aria-label="Leyenda de colores">
          <span><i className="sw col-in" /> columna pivote (entra)</span>
          <span><i className="sw row-out" /> renglón pivote (sale)</span>
          <span><i className="sw pivot" /> número pivote</span>
        </div>
      </section>

      {its.map((it) => (
        <article className="iter" key={it.k} aria-label={it.title}>
          <header>
            <h4>{it.title}</h4>
          </header>
          {it.pre_ops && (
            <p className="ops-line">
              Para que las artificiales queden básicas se elimina M del renglón (0): <code>{it.pre_ops.join(";  ")}</code>
            </p>
          )}
          {it.method === "revised" ? <RevisedSteps it={it} mode={mode} /> : <Tableau it={it} mode={mode} />}
          {it.decision && (
            <ul className="decision">
              {it.decision.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
          {it.method !== "revised" && it.ratios && it.ratios.some((r) => r.den) && (
            <p className="ops-line">
              Razones (LD ÷ coeficiente positivo de la columna {it.entering?.name}):{" "}
              {it.ratios
                .filter((r) => r.den)
                .map((r) => `${r.basic}: ${r.num}/${r.den} = ${r.ratio}`)
                .join(";  ")}
            </p>
          )}
          {it.method !== "revised" && it.ops && it.ops.length > 0 && (
            <p className="ops-line">
              Operaciones de renglón: <code>{it.ops.join(";  ")}</code>
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
