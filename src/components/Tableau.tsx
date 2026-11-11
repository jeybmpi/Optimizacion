import type { Iteration, NumMode } from "../types";
import { cellText, num } from "../lib/numfmt";

export default function Tableau({ it, mode }: { it: Iteration; mode: NumMode }) {
  const nc = it.columns.length;
  const inCol = it.entering?.col;
  const outRow = it.leaving?.row;
  const ratioOf = (row: number) => it.ratios?.find((r) => r.row === row);
  const hasRatios = !!it.ratios;

  return (
    <div className="tab-scroll">
      <table className="tableau">
        <thead>
          <tr>
            <th>Ec.</th>
            <th>VB</th>
            <th>Z</th>
            {it.columns.map((c, j) => (
              <th key={c} className={j === inCol ? "col-in" : undefined}>
                {c}
              </th>
            ))}
            <th>LD</th>
            {hasRatios && <th>Razón</th>}
          </tr>
        </thead>
        <tbody>
          {it.rows.map((row, i) => {
            const rt = ratioOf(i);
            return (
              <tr key={i} className={i === outRow ? "row-out" : undefined}>
                <td className="ec">({i})</td>
                <th scope="row" className="vb">
                  {it.basis[i]}
                </th>
                <td>{i === 0 ? "1" : "0"}</td>
                {row.slice(0, nc).map((c, j) => {
                  const pivot = i === outRow && j === inCol;
                  const cls = pivot ? "pivot" : j === inCol ? "col-in" : undefined;
                  return (
                    <td key={j} className={cls}>
                      {cellText(c, mode)}
                    </td>
                  );
                })}
                <td className="ld">{cellText(row[nc], mode)}</td>
                {hasRatios && (
                  <td className={"ratio" + (i === outRow ? " min" : "")}>
                    {i === 0 ? "" : rt && rt.ratio !== null ? num(rt.ratio, mode) : "—"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
