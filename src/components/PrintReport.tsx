import type { NumMode, ProblemIn, SolveResult, ViewMode } from "../types";
import Solution, { StatusBanner } from "./Solution";
import StepByStep from "./StepByStep";
import GraphicalMethod from "./GraphicalMethod";
import Sensitivity from "./Sensitivity";
import MethodComparison from "./MethodComparison";

const sym = { "<=": "≤", ">=": "≥", "=": "=" } as const;

/**
 * Reporte completo para imprimir / guardar como PDF: modelo, solución, paso a paso (si se resolvió así),
 * método gráfico (n = 2), sensibilidad y comparación de métodos. Solo se monta al exportar.
 */
export default function PrintReport({
  result,
  problem,
  view,
  mode,
}: {
  result: SolveResult;
  problem: ProblemIn;
  view: ViewMode;
  mode: NumMode;
}) {
  const sf = result.standard_form;
  const showSteps = view === "steps" && (result.iterations?.length ?? 0) > 0;
  const date = new Date().toLocaleString("es-CO");
  let n = 0;
  const next = () => ++n;

  return (
    <div className="print-report" aria-hidden="true">
      <header className="pr-head">
        <h1>Reporte de programación lineal</h1>
        <p>
          Método: <strong>{result.method === "revised" ? "simplex revisado" : "Gran M (tablero)"}</strong> · números en{" "}
          <strong>{mode === "frac" ? "fracciones exactas" : "decimales"}</strong> · {date}
        </p>
      </header>

      <section className="pr-section">
        <h2>{next()}. Modelo</h2>
        {sf && <p className="mono-line">{sf.original_objective}</p>}
        <p className="mono-line muted">sujeto a</p>
        {(result.constraints ?? []).map((c, i) => (
          <div className="mono-line" key={i}>
            ({i + 1}) {c.lhs} {sym[c.op]} {c.rhs}
          </div>
        ))}
        <div className="mono-line muted">x ≥ 0</div>
      </section>

      <section className="pr-section">
        <h2>{next()}. Solución</h2>
        <StatusBanner result={result} />
        <Solution result={result} mode={mode} />
      </section>

      {showSteps && (
        <section className="pr-section pr-break">
          <h2>{next()}. Solución paso a paso</h2>
          <StepByStep result={result} mode={mode} />
        </section>
      )}

      <section className="pr-section pr-break">
        <h2>{next()}. Método gráfico</h2>
        <GraphicalMethod problem={problem} result={result} mode={mode} />
      </section>

      {result.status === "optimal" && (
        <section className="pr-section pr-break">
          <h2>{next()}. Análisis de sensibilidad</h2>
          <Sensitivity problem={problem} result={result} mode={mode} />
        </section>
      )}

      <section className="pr-section pr-break">
        <h2>{next()}. Comparación de métodos</h2>
        <MethodComparison problem={problem} mode={mode} />
      </section>
    </div>
  );
}
