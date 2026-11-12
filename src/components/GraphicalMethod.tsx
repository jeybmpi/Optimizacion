import { useMemo, useState } from "react";
import type { NumMode, ProblemIn, SolveResult } from "../types";
import { Frac } from "../lib/sensitivity";
import { dec, num } from "../lib/numfmt";

interface Vertex {
  id: string;
  x1: Frac;
  x2: Frac;
  z: Frac;
  feasible: boolean;
  isOptimal: boolean;
  sources: string;
}

const LINE_COLORS = ["#2b5be8", "#c8243f", "#2fa36b", "#8a5a00", "#7b2cbf", "#0077b6", "#d9480f"];

export default function GraphicalMethod({
  problem,
  result,
  mode,
}: {
  problem: ProblemIn;
  result: SolveResult;
  mode: NumMode;
}) {
  const n = result.n ?? problem.c.length;
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (n !== 2) return null;
    const c1 = Frac.parse(problem.c[0] ?? "0");
    const c2 = Frac.parse(problem.c[1] ?? "0");
    const cons = problem.constraints.map((r, i) => ({
      idx: i + 1,
      label: `R${i + 1}`,
      a1: Frac.parse(r.a[0] ?? "0"),
      a2: Frac.parse(r.a[1] ?? "0"),
      op: r.op,
      b: Frac.parse(r.b ?? "0"),
    }));

    const isFeasible = (x1: Frac, x2: Frac): boolean => {
      if (x1.isNeg() || x2.isNeg()) return false;
      for (const c of cons) {
        const lhs = c.a1.mul(x1).add(c.a2.mul(x2));
        if (c.op === "<=" && lhs.gt(c.b)) return false;
        if (c.op === ">=" && lhs.lt(c.b)) return false;
        if (c.op === "=" && !lhs.sub(c.b).isZero()) return false;
      }
      return true;
    };

    const allLines = [
      ...cons.map((c) => ({ a1: c.a1, a2: c.a2, b: c.b, name: c.label })),
      { a1: new Frac(1n), a2: new Frac(0n), b: new Frac(0n), name: "x₁=0" },
      { a1: new Frac(0n), a2: new Frac(1n), b: new Frac(0n), name: "x₂=0" },
    ];

    const optZ = result.status === "optimal" && result.z ? Frac.parse(result.z) : null;
    const seen = new Map<string, Vertex>();

    for (let i = 0; i < allLines.length; i++) {
      for (let j = i + 1; j < allLines.length; j++) {
        const L1 = allLines[i];
        const L2 = allLines[j];
        const det = L1.a1.mul(L2.a2).sub(L1.a2.mul(L2.a1));
        if (det.isZero()) continue;
        const x1 = L1.b.mul(L2.a2).sub(L1.a2.mul(L2.b)).div(det);
        const x2 = L1.a1.mul(L2.b).sub(L1.b.mul(L2.a1)).div(det);
        if (x1.isNeg() || x2.isNeg()) continue;
        const key = `${x1.toString()},${x2.toString()}`;
        if (!seen.has(key)) {
          const z = c1.mul(x1).add(c2.mul(x2));
          const feas = isFeasible(x1, x2);
          const isOpt = feas && optZ !== null && z.sub(optZ).isZero();
          seen.set(key, {
            id: key,
            x1,
            x2,
            z,
            feasible: feas,
            isOptimal: isOpt,
            sources: `${L1.name} ∩ ${L2.name}`,
          });
        }
      }
    }

    const vertices = Array.from(seen.values());
    const feasibleVerts = vertices.filter((v) => v.feasible);

    let maxX = 10;
    let maxY = 10;
    const ptsForScale = feasibleVerts.length > 0 ? feasibleVerts : vertices;
    if (ptsForScale.length > 0) {
      maxX = Math.max(
        4,
        ...ptsForScale.map((v) => v.x1.toNumber() * 1.28),
        ...cons
          .map((c) => (!c.a1.isZero() ? c.b.div(c.a1).toNumber() : 0))
          .filter((v) => Number.isFinite(v) && v > 0 && v < 5000),
      );
      maxY = Math.max(
        4,
        ...ptsForScale.map((v) => v.x2.toNumber() * 1.28),
        ...cons
          .map((c) => (!c.a2.isZero() ? c.b.div(c.a2).toNumber() : 0))
          .filter((v) => Number.isFinite(v) && v > 0 && v < 5000),
      );
    }

    const boxLines = [
      ...allLines,
      { a1: new Frac(1n), a2: new Frac(0n), b: Frac.parse(maxX.toFixed(2)), name: "boxX" },
      { a1: new Frac(0n), a2: new Frac(1n), b: Frac.parse(maxY.toFixed(2)), name: "boxY" },
    ];
    const polyPts: { x: number; y: number }[] = [];
    const polySeen = new Set<string>();
    for (let i = 0; i < boxLines.length; i++) {
      for (let j = i + 1; j < boxLines.length; j++) {
        const L1 = boxLines[i];
        const L2 = boxLines[j];
        const det = L1.a1.mul(L2.a2).sub(L1.a2.mul(L2.a1));
        if (det.isZero()) continue;
        const x1 = L1.b.mul(L2.a2).sub(L1.a2.mul(L2.b)).div(det);
        const x2 = L1.a1.mul(L2.b).sub(L1.b.mul(L2.a1)).div(det);
        const fx = x1.toNumber();
        const fy = x2.toNumber();
        if (fx < -1e-6 || fy < -1e-6 || fx > maxX + 1e-4 || fy > maxY + 1e-4) continue;
        if (!isFeasible(x1, x2)) continue;
        const k = `${fx.toFixed(4)},${fy.toFixed(4)}`;
        if (!polySeen.has(k)) {
          polySeen.add(k);
          polyPts.push({ x: fx, y: fy });
        }
      }
    }

    if (polyPts.length >= 3) {
      const cx = polyPts.reduce((s, p) => s + p.x, 0) / polyPts.length;
      const cy = polyPts.reduce((s, p) => s + p.y, 0) / polyPts.length;
      polyPts.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
    }

    return { cons, c1, c2, optZ, vertices, feasibleVerts, polyPts, maxX, maxY };
  }, [n, problem, result]);

  if (n !== 2 || !geo) {
    return (
      <div className="empty">
        <span className="lab mute">Geometría 2D</span>
        <h2>Método gráfico</h2>
        <p>
          El método gráfico solo aplica a problemas con 2 variables. Este problema tiene {n}.
        </p>
      </div>
    );
  }

  const W = 720;
  const H = 460;
  const padL = 62;
  const padR = 32;
  const padT = 28;
  const padB = 50;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const sx = (x: number) => padL + (x / geo.maxX) * plotW;
  const sy = (y: number) => padT + plotH - (y / geo.maxY) * plotH;

  const clipLine = (a1: number, a2: number, b: number): [number, number, number, number] | null => {
    const pts: [number, number][] = [];
    const addPt = (x: number, y: number) => {
      if (x >= -1e-5 && x <= geo.maxX + 1e-5 && y >= -1e-5 && y <= geo.maxY + 1e-5) {
        if (!pts.some(([px, py]) => Math.hypot(px - x, py - y) < 1e-4)) {
          pts.push([Math.max(0, Math.min(geo.maxX, x)), Math.max(0, Math.min(geo.maxY, y))]);
        }
      }
    };
    if (Math.abs(a2) > 1e-9) {
      addPt(0, b / a2);
      addPt(geo.maxX, (b - a1 * geo.maxX) / a2);
    }
    if (Math.abs(a1) > 1e-9) {
      addPt(b / a1, 0);
      addPt((b - a2 * geo.maxY) / a1, geo.maxY);
    }
    return pts.length >= 2 ? [pts[0][0], pts[0][1], pts[1][0], pts[1][1]] : null;
  };

  const xTicks = Array.from({ length: 6 }, (_, i) => (geo.maxX * i) / 5);
  const yTicks = Array.from({ length: 6 }, (_, i) => (geo.maxY * i) / 5);
  const isoSeg =
    geo.optZ !== null ? clipLine(geo.c1.toNumber(), geo.c2.toNumber(), geo.optZ.toNumber()) : null;

  return (
    <div className="steps">
      <section className="block">
        <div className="section-head">
          <div>
            <span className="lab mute">Espacio de decisiones (x₁, x₂)</span>
            <h3>Región factible y curva de isoutilidad</h3>
          </div>
          <div className="legend">
            <span>
              <i className="sw" style={{ background: "rgba(199,162,255,0.45)", borderColor: "#111" }} /> región factible
            </span>
            <span>
              <i className="sw" style={{ background: "#ff9fd8", borderColor: "#111" }} /> recta óptima Z*
            </span>
            <span>
              <i className="sw" style={{ background: "#2fa36b", borderColor: "#111" }} /> vértice óptimo
            </span>
          </div>
        </div>

        <div className="graph-wrap">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="lp-graph"
            role="img"
            aria-label="Gráfico de la región factible y vértices"
          >
            <defs>
              <linearGradient id="holo-poly" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ff9fd8" stopOpacity="0.28" />
                <stop offset="50%" stopColor="#8fdcff" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#c7a2ff" stopOpacity="0.38" />
              </linearGradient>
              <clipPath id="plot-clip">
                <rect x={padL} y={padT} width={plotW} height={plotH} />
              </clipPath>
            </defs>

            <rect x={padL} y={padT} width={plotW} height={plotH} fill="#ffffff" stroke="#111" strokeWidth="1.5" />
            {xTicks.map((t, i) => (
              <g key={`xt-${i}`}>
                <line x1={sx(t)} y1={padT} x2={sx(t)} y2={padT + plotH} stroke="#ececec" strokeWidth="1" />
                <text x={sx(t)} y={padT + plotH + 18} textAnchor="middle" className="axis-num">
                  {dec(String(t), 1)}
                </text>
              </g>
            ))}
            {yTicks.map((t, i) => (
              <g key={`yt-${i}`}>
                <line x1={padL} y1={sy(t)} x2={padL + plotW} y2={sy(t)} stroke="#ececec" strokeWidth="1" />
                <text x={padL - 8} y={sy(t) + 4} textAnchor="end" className="axis-num">
                  {dec(String(t), 1)}
                </text>
              </g>
            ))}

            <g clipPath="url(#plot-clip)">
              {geo.polyPts.length >= 3 && (
                <polygon
                  points={geo.polyPts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")}
                  fill="url(#holo-poly)"
                  stroke="#111111"
                  strokeWidth="2"
                />
              )}

              {geo.cons.map((c, idx) => {
                const seg = clipLine(c.a1.toNumber(), c.a2.toNumber(), c.b.toNumber());
                if (!seg) return null;
                const col = LINE_COLORS[idx % LINE_COLORS.length];
                const mx = (sx(seg[0]) + sx(seg[2])) / 2;
                const my = (sy(seg[1]) + sy(seg[3])) / 2;
                return (
                  <g key={c.label}>
                    <line
                      x1={sx(seg[0])}
                      y1={sy(seg[1])}
                      x2={sx(seg[2])}
                      y2={sy(seg[3])}
                      stroke={col}
                      strokeWidth="2.2"
                    />
                    <rect
                      x={mx - 16}
                      y={my - 10}
                      width="32"
                      height="18"
                      rx="9"
                      fill="#ffffff"
                      stroke={col}
                      strokeWidth="1.5"
                    />
                    <text x={mx} y={my + 3} textAnchor="middle" className="line-tag" fill={col}>
                      {c.label}
                    </text>
                  </g>
                );
              })}

              {isoSeg && (
                <line
                  x1={sx(isoSeg[0])}
                  y1={sy(isoSeg[1])}
                  x2={sx(isoSeg[2])}
                  y2={sy(isoSeg[3])}
                  stroke="#111111"
                  strokeWidth="2.8"
                  strokeDasharray="7 5"
                />
              )}
            </g>

            {geo.vertices.map((v, idx) => {
              const cx = sx(v.x1.toNumber());
              const cy = sy(v.x2.toNumber());
              if (cx < padL - 4 || cx > padL + plotW + 4 || cy < padT - 4 || cy > padT + plotH + 4) return null;
              const active = hoverIdx === idx || v.isOptimal;
              return (
                <g
                  key={v.id}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoverIdx(idx)}
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  {v.isOptimal && (
                    <circle cx={cx} cy={cy} r={12} fill="rgba(47,163,107,0.22)" stroke="#2fa36b" strokeWidth="1.5" />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={v.isOptimal ? 6.5 : v.feasible ? 5 : 3.5}
                    fill={v.isOptimal ? "#2fa36b" : v.feasible ? "#111111" : "#ffffff"}
                    stroke="#111111"
                    strokeWidth="2"
                  />
                  {active && (
                    <g transform={`translate(${Math.min(cx + 10, W - 155)}, ${Math.max(cy - 28, padT + 6)})`}>
                      <rect x="0" y="0" width="142" height="24" fill="#111111" stroke="#ffffff" strokeWidth="1" />
                      <text x="7" y="15" fill="#ffffff" className="vertex-tip">
                        ({num(v.x1.toString(), mode)}, {num(v.x2.toString(), mode)}) · Z={num(v.z.toString(), mode)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            <text x={padL + plotW / 2} y={H - 10} textAnchor="middle" className="axis-label">
              Variable x₁
            </text>
            <text
              x={18}
              y={padT + plotH / 2}
              textAnchor="middle"
              transform={`rotate(-90 18 ${padT + plotH / 2})`}
              className="axis-label"
            >
              Variable x₂
            </text>
          </svg>
        </div>
      </section>

      <section className="block">
        <span className="lab mute">Evaluación en los puntos extremos</span>
        <h3>Vértices e intersecciones ({geo.feasibleVerts.length} factibles)</h3>
        <div className="tab-scroll">
          <table className="plain">
            <thead>
              <tr>
                <th>Intersección</th>
                <th>Coordenada (x₁, x₂)</th>
                <th>Valor Z</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {geo.vertices.map((v, i) => (
                <tr
                  key={v.id}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  style={v.isOptimal ? { background: "var(--good-soft)" } : undefined}
                >
                  <th>{v.sources}</th>
                  <td>
                    ({num(v.x1.toString(), mode)}, {num(v.x2.toString(), mode)})
                  </td>
                  <td>{v.feasible ? num(v.z.toString(), mode) : "—"}</td>
                  <td>
                    {v.isOptimal ? (
                      <span className="pill solid">★ Óptimo</span>
                    ) : v.feasible ? (
                      <span className="pill on">Factible</span>
                    ) : (
                      <span className="pill off">Infactible</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
