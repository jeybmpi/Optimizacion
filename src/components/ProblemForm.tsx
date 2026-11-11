import { useRef } from "react";
import type { Op, ProblemIn } from "../types";
import { EXAMPLES } from "../lib/examples";
import { MAX_M, MAX_N, type Validation } from "../lib/validate";

interface Props {
  problem: ProblemIn;
  setProblem: (p: ProblemIn) => void;
  validation: Validation;
  showErrors: boolean;
}

const sub = (j: number) => String(j + 1).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);

export default function ProblemForm({ problem, setProblem, validation, showErrors }: Props) {
  const n = problem.c.length;
  const m = problem.constraints.length;
  const err = (key: string) => (showErrors ? validation.cells[key] : undefined);

  const setC = (j: number, v: string) => setProblem({ ...problem, c: problem.c.map((x, k) => (k === j ? v : x)) });
  const setA = (i: number, j: number, v: string) =>
    setProblem({
      ...problem,
      constraints: problem.constraints.map((r, k) => (k === i ? { ...r, a: r.a.map((x, q) => (q === j ? v : x)) } : r)),
    });
  const setRow = (i: number, patch: Partial<{ op: Op; b: string }>) =>
    setProblem({ ...problem, constraints: problem.constraints.map((r, k) => (k === i ? { ...r, ...patch } : r)) });

  const addVar = () =>
    n < MAX_N &&
    setProblem({ ...problem, c: [...problem.c, "0"], constraints: problem.constraints.map((r) => ({ ...r, a: [...r.a, "0"] })) });
  const delVar = (j: number) =>
    n > 1 &&
    setProblem({
      ...problem,
      c: problem.c.filter((_, k) => k !== j),
      constraints: problem.constraints.map((r) => ({ ...r, a: r.a.filter((_, k) => k !== j) })),
    });
  const addCon = () =>
    m < MAX_M &&
    setProblem({ ...problem, constraints: [...problem.constraints, { a: Array(n).fill("0"), op: "<=", b: "0" }] });
  const delCon = (i: number) =>
    m > 1 && setProblem({ ...problem, constraints: problem.constraints.filter((_, k) => k !== i) });

  const cell = (key: string, value: string, onChange: (v: string) => void, label: string) => (
    <input
      className={"num" + (err(key) ? " bad" : "")}
      value={value}
      inputMode="decimal"
      aria-label={label}
      aria-invalid={err(key) ? true : undefined}
      title={err(key)}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => e.target.select()}
    />
  );

  return (
    <section className="card" aria-labelledby="h-problema">
      <div className="card-head">
        <h2 id="h-problema">Problema</h2>
        <select
          className="examples"
          aria-label="Cargar un ejemplo"
          value=""
          onChange={(e) => {
            const ex = EXAMPLES[Number(e.target.value)];
            if (ex) setProblem(structuredClone(ex.problem));
          }}
        >
          <option value="" disabled>
            Cargar ejemplo…
          </option>
          {EXAMPLES.map((ex, i) => (
            <option key={ex.name} value={i}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid-scroll">
        <table className="model" aria-label="Modelo de programación lineal">
          <thead>
            <tr>
              <th scope="col" className="lead"></th>
              {problem.c.map((_, j) => (
                <th scope="col" key={j}>
                  <span className="var">x{sub(j)}</span>
                  <button
                    type="button"
                    className="icon"
                    onClick={() => delVar(j)}
                    disabled={n <= 1}
                    aria-label={`Quitar variable x${j + 1}`}
                    title="Quitar variable"
                  >
                    ×
                  </button>
                </th>
              ))}
              <th scope="col" className="lead"></th>
              <th scope="col" className="rhs-h">
                Lado der.
              </th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="obj">
              <th scope="row" className="lead">
                <select
                  aria-label="Objetivo"
                  value={problem.sense}
                  onChange={(e) => setProblem({ ...problem, sense: e.target.value as "max" | "min" })}
                >
                  <option value="max">Max Z</option>
                  <option value="min">Min Z</option>
                </select>
              </th>
              {problem.c.map((v, j) => (
                <td key={j}>{cell(`c:${j}`, v, (x) => setC(j, x), `Coeficiente de x${j + 1} en Z`)}</td>
              ))}
              <td colSpan={3}></td>
            </tr>
            {problem.constraints.map((r, i) => (
              <tr key={i}>
                <th scope="row" className="lead">
                  R{i + 1}
                </th>
                {r.a.map((v, j) => (
                  <td key={j}>{cell(`a:${i}:${j}`, v, (x) => setA(i, j, x), `Restricción ${i + 1}, coeficiente de x${j + 1}`)}</td>
                ))}
                <td className="lead">
                  <select
                    className="op"
                    aria-label={`Tipo de la restricción ${i + 1}`}
                    value={r.op}
                    onChange={(e) => setRow(i, { op: e.target.value as Op })}
                  >
                    <option value="<=">≤</option>
                    <option value=">=">≥</option>
                    <option value="=">=</option>
                  </select>
                </td>
                <td>{cell(`b:${i}`, r.b, (x) => setRow(i, { b: x }), `Restricción ${i + 1}, lado derecho`)}</td>
                <td>
                  <button
                    type="button"
                    className="icon"
                    onClick={() => delCon(i)}
                    disabled={m <= 1}
                    aria-label={`Quitar restricción ${i + 1}`}
                    title="Quitar restricción"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row-actions">
        <button type="button" className="ghost" onClick={addVar} disabled={n >= MAX_N}>
          + Variable
        </button>
        <button type="button" className="ghost" onClick={addCon} disabled={m >= MAX_M}>
          + Restricción
        </button>
      </div>
      <p className="hint">Se asume x ≥ 0. Acepta enteros, decimales (2.5) y fracciones (3/4). Los lados derechos pueden ser negativos.</p>
    </section>
  );
}

export function FileTools({ problem, setProblem, onError }: { problem: ProblemIn; setProblem: (p: ProblemIn) => void; onError: (m: string) => void }) {
  const input = useRef<HTMLInputElement>(null);

  const save = () => {
    const blob = new Blob([JSON.stringify(problem, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "problema-pl.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const load = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text());
      const ok =
        (raw.sense === "max" || raw.sense === "min") &&
        Array.isArray(raw.c) &&
        raw.c.length > 0 &&
        Array.isArray(raw.constraints) &&
        raw.constraints.length > 0 &&
        raw.constraints.every((r: { a?: unknown; op?: unknown }) => Array.isArray(r.a) && ["<=", ">=", "="].includes(r.op as string));
      if (!ok) throw new Error("formato");
      setProblem({
        sense: raw.sense,
        c: raw.c.map(String),
        constraints: raw.constraints.map((r: { a: unknown[]; op: Op; b: unknown }) => ({
          a: r.a.map(String),
          op: r.op,
          b: String(r.b ?? ""),
        })),
      });
    } catch {
      onError("El archivo no es un problema válido. Debe ser un JSON guardado desde esta aplicación.");
    }
  };

  return (
    <div className="row-actions">
      <button type="button" className="ghost" onClick={save}>
        Guardar archivo
      </button>
      <button type="button" className="ghost" onClick={() => input.current?.click()}>
        Abrir archivo
      </button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void load(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
