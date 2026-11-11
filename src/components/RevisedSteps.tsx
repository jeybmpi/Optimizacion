import type { Iteration, NumMode } from "../types";
import { cellText, num } from "../lib/numfmt";

export default function RevisedSteps({ it, mode }: { it: Iteration; mode: NumMode }) {
  const basis = it.basis;
  const m = basis.length;
  const binv = it.binv ?? [];
  const leaving = it.leaving?.row;
  const enteringName = it.entering?.name;

  return (
    <>
      <div className="rev-grid">
        <div>
          <h5>B⁻¹ y variables básicas</h5>
          <div className="tab-scroll">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Básica</th>
                  {Array.from({ length: m }, (_, k) => (
                    <th key={k}>R{k + 1}</th>
                  ))}
                  <th>x_B = B⁻¹b</th>
                </tr>
              </thead>
              <tbody>
                {binv.map((row, i) => (
                  <tr key={i} className={i + 1 === leaving ? "row-out" : undefined}>
                    <th scope="row" className="vb">
                      {basis[i]}
                    </th>
                    {row.map((v, k) => (
                      <td key={k}>{num(v, mode)}</td>
                    ))}
                    <td className="ld">{num(it.xb?.[i] ?? "0", mode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h5>Costos reducidos z_j − c_j (no básicas)</h5>
          <table className="tableau compact">
            <thead>
              <tr>
                <th>Variable</th>
                <th>z_j − c_j</th>
              </tr>
            </thead>
            <tbody>
              {it.rc?.map((r) => (
                <tr key={r.name}>
                  <th scope="row" className={"vb" + (r.name === enteringName ? " col-in" : "")}>
                    {r.name}
                  </th>
                  <td className={r.name === enteringName ? "col-in" : undefined}>{cellText(r.value, mode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="ops-line">
        y = c_B·B⁻¹ = (<code>{it.y?.map((c) => cellText(c, mode)).join(", ")}</code>) &nbsp;·&nbsp; Z = c_B·x_B ={" "}
        <code>{it.z ? cellText(it.z, mode) : ""}</code>
      </p>

      {it.ratios && it.d && (
        <>
          <h5>Dirección d = B⁻¹·A_{enteringName} y razón mínima</h5>
          <div className="tab-scroll">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Básica</th>
                  <th>x_B</th>
                  <th>d</th>
                  <th>Razón x_B / d</th>
                </tr>
              </thead>
              <tbody>
                {it.ratios.map((r, i) => (
                  <tr key={r.row} className={r.row === leaving ? "row-out" : undefined}>
                    <th scope="row" className="vb">
                      {r.basic}
                    </th>
                    <td>{num(r.num ?? "0", mode)}</td>
                    <td className={r.row === leaving ? "pivot" : "col-in"}>{num(it.d![i], mode)}</td>
                    <td className={"ratio" + (r.row === leaving ? " min" : "")}>{r.ratio !== null ? num(r.ratio, mode) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
