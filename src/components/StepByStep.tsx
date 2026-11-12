import { useState } from "react";
import type { NumMode, SolveResult } from "../types";
import Tableau from "./Tableau";
import RevisedSteps from "./RevisedSteps";

export default function StepByStep({ result, mode }: { result: SolveResult; mode: NumMode }) {
  const sf = result.standard_form;
  const its = result.iterations ?? [];
  const [selectedIter, setSelectedIter] = useState<number | "all">("all");

  if (!sf) return null;

  const visibleIts = selectedIter === "all" ? its : its.filter((it) => it.k === selectedIter);

  return (
    <div className="steps">
      <section className="block">
        <div className="section-head">
          <div>
            <span className="lab mute">Paso 01 · Normalización</span>
            <h3>1. Forma estándar aumentada</h3>
          </div>
          <button
            type="button"
            className="ghost"
            onClick={() => window.print()}
            title="Imprimir o guardar como PDF"
          >
            🖨 Exportar PDF
          </button>
        </div>
        <p className="hint" style={{ marginTop: 4 }}>
          Método: {result.method === "revised" ? "simplex revisado (con B⁻¹)" : "Gran M (tablero simplex)"}.
        </p>
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
        <div>
          <span className="lab mute">Paso 02 · Secuencia de pivoteo</span>
          <h3>2. Iteraciones ({its.length})</h3>
        </div>
        <div className="legend" aria-label="Leyenda de colores">
          <span>
            <i className="sw col-in" /> columna pivote (entra)
          </span>
          <span>
            <i className="sw row-out" /> renglón pivote (sale)
          </span>
          <span>
            <i className="sw pivot" /> número pivote
          </span>
        </div>
        {its.length > 1 && (
          <div className="iter-pills" aria-label="Filtrar iteración">
            <button
              type="button"
              className={"pill-btn" + (selectedIter === "all" ? " on" : "")}
              onClick={() => setSelectedIter("all")}
            >
              Todas ({its.length})
            </button>
            {its.map((it) => (
              <button
                key={it.k}
                type="button"
                className={"pill-btn" + (selectedIter === it.k ? " on" : "")}
                onClick={() => setSelectedIter(it.k)}
              >
                {it.k === -1 ? "Pre-M" : `Iter ${it.k}`}
              </button>
            ))}
          </div>
        )}
      </section>

      {visibleIts.map((it) => (
        <article className="iter" key={it.k} aria-label={it.title}>
          <header className="iter-head">
            <h4>{it.title}</h4>
            <div className="iter-badges">
              {it.entering && <span className="pill on">↓ Entra {it.entering.name}</span>}
              {it.leaving && <span className="pill off">↑ Sale {it.leaving.name}</span>}
              {it.pivot && <span className="pill solid">Pivote {it.pivot.value}</span>}
            </div>
          </header>
          {it.pre_ops && (
            <p className="ops-line">
              Para que las artificiales queden básicas se elimina M del renglón (0):{" "}
              <code>{it.pre_ops.join(";  ")}</code>
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
