import type { NumMode, SolveResult } from "../types";
import { dec, isFraction, num } from "../lib/numfmt";

function Val({ v, mode }: { v: string; mode: NumMode }) {
  return (
    <>
      {num(v, mode)}
      {mode === "frac" && isFraction(v) && <span className="approx"> ≈ {dec(v)}</span>}
    </>
  );
}

const sym = { "<=": "≤", ">=": "≥", "=": "=" } as const;

export function StatusBanner({ result }: { result: SolveResult }) {
  const ok = result.status === "optimal";
  const tone = ok ? (result.multiple || result.degenerate ? "warn" : "good") : "bad";
  const title = ok
    ? "Solución óptima"
    : result.status === "infeasible"
      ? "Sin solución factible"
      : result.status === "unbounded"
        ? "Solución no acotada"
        : "No se pudo resolver";
  return (
    <div className={`banner ${tone}`} role="status">
      <div className="banner-top">
        <strong>{title}</strong>
        <div className="banner-pills">
          {typeof result.n_iterations === "number" && (
            <span className="pill">{result.n_iterations} iteraciones</span>
          )}
          <span className="pill solid">
            {result.method === "revised" ? "Simplex revisado" : "Gran M"}
          </span>
        </div>
      </div>
      <p>{result.message}</p>
    </div>
  );
}

export default function Solution({ result, mode }: { result: SolveResult; mode: NumMode }) {
  const ok = result.status === "optimal";
  if (!ok || !result.x || !result.z) {
    return (
      <div className="empty">
        <p>
          No hay valores para mostrar: el problema no tiene un óptimo finito. Revisa el mensaje de arriba y, en modo
          paso a paso, las iteraciones.
        </p>
      </div>
    );
  }

  return (
    <div className="solution">
      <div className="zbox">
        <div>
          <span className="lab mute">Valor objetivo óptimo</span>
          <div className="zrow">
            <span className="zlabel">Z{result.sense === "min" ? " mínimo" : " máximo"} =</span>
            <span className="zval">
              <Val v={result.z} mode={mode} />
            </span>
          </div>
        </div>
        {result.final_basis && (
          <div className="basis-strip">
            <span className="lab mute">Base final</span>
            <div className="basis-pills">
              {result.final_basis.map((b, idx) => (
                <span key={`${b}-${idx}`} className="pill">
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="two">
        <div className="block">
          <span className="lab mute">Vector solución x*</span>
          <h3>Variables de decisión</h3>
          <table className="plain">
            <tbody>
              {result.x.map((v) => (
                <tr key={v.name}>
                  <th scope="row">{v.name}</th>
                  <td>
                    <Val v={v.value} mode={mode} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.multiple && result.alt && !result.alt.ray && result.alt.x && (
            <p className="hint">
              Otro vértice óptimo: ({result.alt.x.map((t) => num(t, mode)).join(", ")}). Cualquier combinación convexa
              de los dos también es óptima.
            </p>
          )}
        </div>
        <div className="block">
          <span className="lab mute">Uso de recursos</span>
          <h3>Holgura / exceso por restricción</h3>
          <table className="plain">
            <thead>
              <tr>
                <th></th>
                <th>Lado izq.</th>
                <th>Lado der.</th>
                <th>Valor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {result.constraints?.map((c, i) => (
                <tr key={i}>
                  <th scope="row">R{i + 1}</th>
                  <td>
                    <Val v={c.lhs} mode={mode} />
                  </td>
                  <td>
                    {sym[c.op]} <Val v={c.rhs} mode={mode} />
                  </td>
                  <td>
                    {c.kind === "igualdad" ? (
                      "—"
                    ) : (
                      <>
                        <Val v={c.slack} mode={mode} /> <span className="kind">({c.kind})</span>
                      </>
                    )}
                  </td>
                  <td>
                    <span className={"pill " + (c.binding ? "on" : "off")}>
                      {c.binding ? "activa" : "con margen"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
