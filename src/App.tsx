import { useMemo, useState } from "react";
import ProblemForm, { FileTools } from "./components/ProblemForm";
import Solution, { StatusBanner } from "./components/Solution";
import StepByStep from "./components/StepByStep";
import CloudPanel from "./components/CloudPanel";
import { solve } from "./lib/api";
import { cloudEnabled } from "./lib/cloud";
import { EMPTY_PROBLEM } from "./lib/examples";
import { validateProblem } from "./lib/validate";
import type { Method, NumMode, ProblemIn, SolveResult, ViewMode } from "./types";

type Tab = "solution" | "steps" | "graph" | "sens";

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; text: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? "on" : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [problem, setProblem] = useState<ProblemIn>(structuredClone(EMPTY_PROBLEM));
  const [view, setView] = useState<ViewMode>("steps");
  const [method, setMethod] = useState<Method>("bigm");
  const [numMode, setNumMode] = useState<NumMode>("frac");
  const [result, setResult] = useState<SolveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [tab, setTab] = useState<Tab>("steps");
  const [fileError, setFileError] = useState<string | null>(null);

  const validation = useMemo(() => validateProblem(problem), [problem]);
  const invalid = validation.messages.length > 0;

  const run = async (v: ViewMode, mth: Method = method) => {
    setAttempted(true);
    setFileError(null);
    if (invalid) {
      setResult(null);
      return;
    }
    setLoading(true);
    const r = await solve(problem, v === "steps", mth);
    setLoading(false);
    setResult(r);
    setTab(v === "steps" ? "steps" : "solution");
  };

  const changeView = (v: ViewMode) => {
    setView(v);
    if (result && result.status !== "invalid" && result.status !== "error") void run(v);
    else if (v === "direct" && tab === "steps") setTab("solution");
  };

  const changeMethod = (mth: Method) => {
    setMethod(mth);
    if (result && result.status !== "invalid" && result.status !== "error") void run(view, mth);
  };

  const edit = (p: ProblemIn) => {
    setProblem(p);
    setFileError(null);
  };

  const hasResult = result && result.status !== "invalid" && result.status !== "error";
  const showSteps = hasResult && view === "steps" && (result.iterations?.length ?? 0) > 0;
  const tabs: { id: Tab; text: string; soon?: boolean }[] = [
    { id: "solution", text: "Solución" },
    ...(view === "steps" ? [{ id: "steps" as Tab, text: "Paso a paso" }] : []),
    { id: "graph", text: "Método gráfico", soon: true },
    { id: "sens", text: "Sensibilidad", soon: true },
  ];

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Simplex paso a paso</h1>
          <p>Programación lineal por la Gran M o por el simplex revisado, con aritmética exacta.</p>
        </div>
        <div className="top-controls">
          <Segmented
            label="Método"
            value={method}
            onChange={changeMethod}
            options={[
              { value: "bigm", text: "Gran M" },
              { value: "revised", text: "Simplex revisado" },
            ]}
          />
          <Segmented
            label="Modo de solución"
            value={view}
            onChange={changeView}
            options={[
              { value: "direct", text: "Solución directa" },
              { value: "steps", text: "Paso a paso" },
            ]}
          />
          <Segmented
            label="Formato de números"
            value={numMode}
            onChange={setNumMode}
            options={[
              { value: "frac", text: "Fracciones" },
              { value: "dec", text: "Decimales" },
            ]}
          />
        </div>
      </header>

      <main className="layout">
        <div className="left">
          <ProblemForm problem={problem} setProblem={edit} validation={validation} showErrors={attempted} />

          {attempted && invalid && (
            <div className="banner bad" role="alert">
              <strong>Corrige estos datos para resolver</strong>
              <ul>
                {validation.messages.slice(0, 6).map((m) => (
                  <li key={m}>{m}</li>
                ))}
                {validation.messages.length > 6 && <li>y {validation.messages.length - 6} más…</li>}
              </ul>
            </div>
          )}
          {fileError && (
            <div className="banner bad" role="alert">
              <p>{fileError}</p>
            </div>
          )}

          <button type="button" className="primary" onClick={() => void run(view)} disabled={loading}>
            {loading ? "Resolviendo…" : view === "steps" ? "Resolver paso a paso" : "Resolver"}
          </button>

          <FileTools problem={problem} setProblem={edit} onError={setFileError} />
          {cloudEnabled && <CloudPanel problem={problem} onLoad={edit} />}
        </div>

        <div className="right" aria-live="polite">
          {!result && (
            <div className="empty">
              <h2>Aquí aparecerá el resultado</h2>
              <p>
                Edita el modelo, o carga uno de los ejemplos, y pulsa <strong>Resolver</strong>. En modo paso a paso verás la forma
                estándar y cada iteración con su variable que entra, la razón mínima y el pivote.
              </p>
            </div>
          )}

          {result && (result.status === "invalid" || result.status === "error") && (
            <div className="banner bad" role="alert">
              <strong>{result.status === "invalid" ? "Revisa el problema" : "Algo salió mal"}</strong>
              {result.errors ? (
                <ul>
                  {result.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              ) : (
                <p>{result.message}</p>
              )}
            </div>
          )}

          {hasResult && (
            <>
              <StatusBanner result={result} />
              <div className="tabs" role="tablist">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    className={(tab === t.id ? "on " : "") + (t.soon ? "soon" : "")}
                    onClick={() => setTab(t.id)}
                  >
                    {t.text}
                  </button>
                ))}
              </div>

              {tab === "solution" && <Solution result={result} mode={numMode} />}
              {tab === "steps" && showSteps && <StepByStep result={result} mode={numMode} />}
              {tab === "graph" && (
                <div className="empty">
                  <h2>Método gráfico</h2>
                  {(result.n ?? 0) > 2 ? (
                    <p>El método gráfico solo aplica a problemas con 2 variables. Este problema tiene {result.n}.</p>
                  ) : (
                    <p>Pendiente para el Sprint 2: región factible, vértices con su Z y recta de isoutilidad en el óptimo.</p>
                  )}
                </div>
              )}
              {tab === "sens" && (
                <div className="empty">
                  <h2>Análisis de sensibilidad</h2>
                  <p>Pendiente para el Sprint 2: precios sombra, costos reducidos y rangos de c y b.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
