import { useMemo, useState } from "react";
import ProblemForm, { FileTools } from "./components/ProblemForm";
import Solution, { StatusBanner } from "./components/Solution";
import StepByStep from "./components/StepByStep";
import GraphicalMethod from "./components/GraphicalMethod";
import Sensitivity from "./components/Sensitivity";
import CloudPanel from "./components/CloudPanel";
import { solve } from "./lib/api";
import { cloudEnabled } from "./lib/cloud";
import { EMPTY_PROBLEM } from "./lib/examples";
import { validateProblem } from "./lib/validate";
import type { Method, NumMode, ProblemIn, SolveResult, ViewMode } from "./types";

type Tab = "solution" | "steps" | "graph" | "sens";

function FlowerIcon({ className = "flower" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="fpg-opt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9fd8" />
          <stop offset="0.35" stopColor="#ffe28c" />
          <stop offset="0.65" stopColor="#8fdcff" />
          <stop offset="1" stopColor="#c7a2ff" />
        </linearGradient>
      </defs>
      <g fill="url(#fpg-opt)" stroke="#111" strokeWidth="2">
        <circle cx="20" cy="9.5" r="7" />
        <circle cx="30" cy="16.8" r="7" />
        <circle cx="26.2" cy="28.6" r="7" />
        <circle cx="13.8" cy="28.6" r="7" />
        <circle cx="10" cy="16.8" r="7" />
      </g>
      <circle cx="20" cy="20" r="5.2" fill="#111" />
    </svg>
  );
}

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
    <div className="seg-group">
      <span className="lab mute">{label}</span>
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
    </div>
  );
}

export default function App() {
  const [problem, setProblem] = useState<ProblemIn>(structuredClone(EMPTY_PROBLEM));
  const [view, setView] = useState<ViewMode>("steps");
  const [method, setMethod] = useState<Method>("bigm");
  const [numMode, setNumMode] = useState<NumMode>("frac");
  const [result, setResult] = useState<SolveResult | null>(null);
  // Copia del problema tal como se envió al solver: el gráfico y la sensibilidad deben usar ESTA
  // copia (no el formulario, que el usuario puede seguir editando después de resolver).
  const [solvedProblem, setSolvedProblem] = useState<ProblemIn | null>(null);
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
    const snapshot = structuredClone(problem);
    const r = await solve(snapshot, v === "steps", mth);
    setLoading(false);
    setSolvedProblem(snapshot);
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
  // ¿el formulario ya no coincide con el problema que produjo el resultado mostrado?
  const stale = !!solvedProblem && JSON.stringify(solvedProblem) !== JSON.stringify(problem);
  const showSteps = hasResult && view === "steps" && (result.iterations?.length ?? 0) > 0;
  const tabs: { id: Tab; text: string }[] = [
    { id: "solution", text: "Solución" },
    ...(view === "steps" ? [{ id: "steps" as Tab, text: "Paso a paso" }] : []),
    { id: "graph", text: "Método gráfico" },
    { id: "sens", text: "Sensibilidad" },
  ];

  return (
    <div className="page-shell">
      <header className="topbar">
        <a className="brand" href="#top">
          <FlowerIcon />
          <span>SimplexPoint</span>
          <span className="pill">PL · Exacto</span>
        </a>
        <span className="lab mute">optimización lineal · gran m &amp; b⁻¹</span>
      </header>
      <div className="holo-line" />

      <div className="app" id="top">
        <header className="top">
          <div className="hero-copy">
            <span className="lab rise">Programación Lineal · Aritmética Racional Simbólica</span>
            <h1 className="rise" style={{ ["--d" as string]: 1 }}>
              Paso a paso
            </h1>
            <p className="rise" style={{ ["--d" as string]: 2 }}>
              Programación lineal por la Gran M o por el simplex revisado, con aritmética exacta, geometría 2D y
              análisis de sensibilidad.
            </p>
          </div>
          <div className="top-controls rise" style={{ ["--d" as string]: 3 }}>
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
              <div className="empty fp-empty">
                <div className="fp-empty-head">
                  <FlowerIcon className="flower big-empty-flower" />
                  <div>
                    <span className="lab mute">Listo para calcular</span>
                    <h2>Aquí aparecerá el resultado</h2>
                  </div>
                </div>
                <p>
                  Edita el modelo, o carga uno de los ejemplos, y pulsa <strong>Resolver</strong>. En modo paso a paso
                  verás la forma estándar y cada iteración con su variable que entra, la razón mínima y el pivote.
                </p>
                <div className="fp-pills-row">
                  <span className="pill">Fracciones exactas</span>
                  <span className="pill">M simbólica</span>
                  <span className="pill">Gráfico 2D</span>
                  <span className="pill">Sensibilidad</span>
                </div>
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
                {stale && (
                  <div className="banner warn" role="status">
                    <p>
                      Cambiaste el modelo después de resolver. Estos resultados corresponden al problema anterior;
                      pulsa <strong>Resolver</strong> para actualizarlos.
                    </p>
                  </div>
                )}
                <div className="tabs" role="tablist">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={tab === t.id}
                      className={tab === t.id ? "on" : undefined}
                      onClick={() => setTab(t.id)}
                    >
                      {t.text}
                    </button>
                  ))}
                </div>

                {tab === "solution" && <Solution result={result} mode={numMode} />}
                {tab === "steps" && showSteps && <StepByStep result={result} mode={numMode} />}
                {tab === "graph" && solvedProblem && <GraphicalMethod problem={solvedProblem} result={result} mode={numMode} />}
                {tab === "sens" && solvedProblem && <Sensitivity problem={solvedProblem} result={result} mode={numMode} />}
              </>
            )}
          </div>
        </main>

        <section className="how" aria-label="Cómo funciona">
          <div>
            <span className="lab mute">01</span>
            <b>M simbólica y fracciones exactas</b>
            <span>
              Cada celda se representa como a + b·M con números racionales exactos; jamás se aproxima M por un flotante
              como 10⁶.
            </span>
          </div>
          <div>
            <span className="lab mute">02</span>
            <b>Gran M tabular y Simplex Revisado</b>
            <span>
              Alterna en un clic entre el tablero completo de Gauss-Jordan y la actualización matricial explícita con
              B⁻¹ y costos reducidos.
            </span>
          </div>
          <div>
            <span className="lab mute">03</span>
            <b>Geometría 2D y Sensibilidad Dual</b>
            <span>
              Explora el polígono factible, la recta de isoutilidad, los precios sombra y los intervalos de optimalidad
              y factibilidad.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
