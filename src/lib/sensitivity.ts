import type { ProblemIn, SolveResult } from "../types";

/** Aritmética racional exacta en cliente para sensibilidad y geometría. */
export class Frac {
  readonly n: bigint;
  readonly d: bigint;

  constructor(n: bigint | number, d: bigint | number = 1n) {
    let num = typeof n === "bigint" ? n : BigInt(Math.round(n));
    let den = typeof d === "bigint" ? d : BigInt(Math.round(d));
    if (den === 0n) {
      this.n = 0n;
      this.d = 1n;
      return;
    }
    if (den < 0n) {
      num = -num;
      den = -den;
    }
    const g = Frac.gcd(num < 0n ? -num : num, den);
    this.n = num / g;
    this.d = den / g;
  }

  static gcd(a: bigint, b: bigint): bigint {
    while (b !== 0n) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a === 0n ? 1n : a;
  }

  static parse(raw: string): Frac {
    const s = raw.trim().replace(",", ".");
    if (!s) return new Frac(0n, 1n);
    if (s.includes("/")) {
      const [a, b] = s.split("/");
      return Frac.parse(a).div(Frac.parse(b));
    }
    const neg = s.startsWith("-");
    const clean = s.replace(/^[+-]/, "");
    const parts = clean.split(".");
    if (parts.length === 1) {
      const n = BigInt(parts[0] || "0");
      return new Frac(neg ? -n : n, 1n);
    }
    const dec = parts[1];
    const scale = 10n ** BigInt(dec.length);
    const n = BigInt((parts[0] || "0") + dec);
    return new Frac(neg ? -n : n, scale);
  }

  add(o: Frac): Frac {
    return new Frac(this.n * o.d + o.n * this.d, this.d * o.d);
  }
  sub(o: Frac): Frac {
    return new Frac(this.n * o.d - o.n * this.d, this.d * o.d);
  }
  mul(o: Frac): Frac {
    return new Frac(this.n * o.n, this.d * o.d);
  }
  div(o: Frac): Frac {
    return new Frac(this.n * o.d, this.d * o.n);
  }
  neg(): Frac {
    return new Frac(-this.n, this.d);
  }
  isZero(): boolean {
    return this.n === 0n;
  }
  isPos(): boolean {
    return this.n > 0n;
  }
  isNeg(): boolean {
    return this.n < 0n;
  }
  lt(o: Frac): boolean {
    return this.n * o.d < o.n * this.d;
  }
  lte(o: Frac): boolean {
    return this.n * o.d <= o.n * this.d;
  }
  gt(o: Frac): boolean {
    return this.n * o.d > o.n * this.d;
  }
  toNumber(): number {
    return Number(this.n) / Number(this.d);
  }
  toString(): string {
    return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`;
  }
}

export interface VarSensitivity {
  name: string;
  originalC: string;
  optValue: string;
  reducedCost: string;
  isBasic: boolean;
  cMin: string | null; // null = -∞
  cMax: string | null; // null = +∞
  allowableDec: string | null;
  allowableInc: string | null;
}

export interface ConSensitivity {
  index: number;
  name: string;
  op: "<=" | ">=" | "=";
  originalB: string;
  lhsValue: string;
  slackValue: string;
  binding: boolean;
  shadowPrice: string;
  bMin: string | null; // null = -∞
  bMax: string | null; // null = +∞
  allowableDec: string | null;
  allowableInc: string | null;
}

export interface SensitivityReport {
  variables: VarSensitivity[];
  constraints: ConSensitivity[];
  binv: string[][];
  basisNames: string[];
}

export function computeSensitivity(problem: ProblemIn, result: SolveResult): SensitivityReport | null {
  if (result.status !== "optimal" || !result.x || !result.final_basis) return null;

  const n = problem.c.length;
  const m = problem.constraints.length;
  const isMax = problem.sense === "max";

  const cOrig = problem.c.map(Frac.parse);
  // internamente trabajamos en forma Max Z' = c_max · x
  const cMax = cOrig.map((v) => (isMax ? v : v.neg()));

  // Reconstruir la matriz aumentada exactamente como en bigm.py
  const rowFlip: boolean[] = [];
  const normRows = problem.constraints.map((con) => {
    const a = con.a.map(Frac.parse);
    const b = Frac.parse(con.b);
    if (b.isNeg()) {
      rowFlip.push(true);
      const newOp = con.op === "<=" ? ">=" : con.op === ">=" ? "<=" : "=";
      return { a: a.map((x) => x.neg()), op: newOp as "<=" | ">=" | "=", b: b.neg() };
    }
    rowFlip.push(false);
    return { a, op: con.op, b };
  });

  const names: string[] = Array.from({ length: n }, (_, j) => `x${j + 1}`);
  const kinds: ("x" | "s" | "e" | "a")[] = Array(n).fill("x");
  const slackCol: (number | null)[] = Array(m).fill(null);
  const artCol: (number | null)[] = Array(m).fill(null);

  normRows.forEach((r, i) => {
    if (r.op === "<=") {
      slackCol[i] = names.length;
      names.push(`s${i + 1}`);
      kinds.push("s");
    } else if (r.op === ">=") {
      slackCol[i] = names.length;
      names.push(`e${i + 1}`);
      kinds.push("e");
    }
  });
  normRows.forEach((r, i) => {
    if (r.op === ">=" || r.op === "=") {
      artCol[i] = names.length;
      names.push(`a${i + 1}`);
      kinds.push("a");
    }
  });

  const N = names.length;
  const A: Frac[][] = normRows.map((r, i) => {
    const row = Array.from({ length: N }, () => new Frac(0n));
    for (let j = 0; j < n; j++) row[j] = r.a[j];
    if (r.op === "<=" && slackCol[i] !== null) row[slackCol[i]!] = new Frac(1n);
    else if (r.op === ">=") {
      if (slackCol[i] !== null) row[slackCol[i]!] = new Frac(-1n);
      if (artCol[i] !== null) row[artCol[i]!] = new Frac(1n);
    } else if (artCol[i] !== null) {
      row[artCol[i]!] = new Frac(1n);
    }
    return row;
  });

  const bVec = normRows.map((r) => r.b);
  const costMax: Frac[] = names.map((_, j) => (j < n ? cMax[j] : new Frac(0n)));

  // Índices de la base final
  const basisIdx = result.final_basis.map((nm) => names.indexOf(nm));
  if (basisIdx.some((idx) => idx < 0) || basisIdx.length !== m) return null;

  // Invertir la matriz básica B (m x m) por Gauss-Jordan
  const aug: Frac[][] = Array.from({ length: m }, (_, i) => [
    ...basisIdx.map((colIdx) => A[i][colIdx]),
    ...Array.from({ length: m }, (__, k) => new Frac(i === k ? 1n : 0n)),
  ]);

  for (let col = 0; col < m; col++) {
    let piv = col;
    while (piv < m && aug[piv][col].isZero()) piv++;
    if (piv === m) return null;
    if (piv !== col) {
      [aug[col], aug[piv]] = [aug[piv], aug[col]];
    }
    const pv = aug[col][col];
    aug[col] = aug[col].map((v) => v.div(pv));
    for (let r = 0; r < m; r++) {
      if (r !== col && !aug[r][col].isZero()) {
        const f = aug[r][col];
        aug[r] = aug[r].map((v, k) => v.sub(f.mul(aug[col][k])));
      }
    }
  }

  const Binv: Frac[][] = aug.map((row) => row.slice(m, 2 * m));

  // x_B = B^-1 b
  const xB: Frac[] = Array.from({ length: m }, (_, i) =>
    Binv[i].reduce((acc, bij, k) => acc.add(bij.mul(bVec[k])), new Frac(0n)),
  );

  // c_B (en forma Max) y vector multiplicador simplex y_max = c_B · B^-1
  const cB: Frac[] = basisIdx.map((j) => costMax[j]);
  const yMax: Frac[] = Array.from({ length: m }, (_, k) =>
    cB.reduce((acc, cbi, i) => acc.add(cbi.mul(Binv[i][k])), new Frac(0n)),
  );

  // Tablero final: columna j transformada d_j = B^-1 A_j y costo reducido rcMax_j = yMax · A_j - costMax_j
  const dCols: Frac[][] = Array.from({ length: N }, (_, j) =>
    Array.from({ length: m }, (__, i) => Binv[i].reduce((acc, bik, k) => acc.add(bik.mul(A[k][j])), new Frac(0n))),
  );
  const rcMax: Frac[] = Array.from({ length: N }, (_, j) => {
    const yAj = yMax.reduce((acc, yk, k) => acc.add(yk.mul(A[k][j])), new Frac(0n));
    return yAj.sub(costMax[j]);
  });

  // 1. Sensibilidad de coeficientes de la función objetivo c_j (j = 0..n-1)
  const variables: VarSensitivity[] = Array.from({ length: n }, (_, j) => {
    const bPos = basisIdx.indexOf(j);
    const isBasic = bPos >= 0;
    const rc = isMax ? rcMax[j] : rcMax[j].neg();

    // Para perturbación delta en cMax[j]:
    // Si j es NO básica: nuevo rcMax[j] = rcMax[j] - delta >= 0  =>  delta <= rcMax[j]
    // Si j es básica en fila bPos: para toda no básica no artificial k:
    //   rcMax[k] + delta * dCols[k][bPos] >= 0
    let deltaMaxLow: Frac | null = null; // cota inferior de delta en cMax
    let deltaMaxHigh: Frac | null = null; // cota superior de delta en cMax

    if (!isBasic) {
      deltaMaxHigh = rcMax[j];
    } else {
      for (let k = 0; k < N; k++) {
        if (basisIdx.includes(k) || kinds[k] === "a") continue;
        const aij = dCols[k][bPos];
        if (aij.isZero()) continue;
        // delta * aij >= -rcMax[k]
        const bound = rcMax[k].neg().div(aij);
        if (aij.isPos()) {
          if (deltaMaxLow === null || bound.gt(deltaMaxLow)) deltaMaxLow = bound;
        } else {
          if (deltaMaxHigh === null || bound.lt(deltaMaxHigh)) deltaMaxHigh = bound;
        }
      }
    }

    // Convertir cotas de delta en cMax a delta en cOrig:
    // Si isMax: cOrig = cMax => deltaOrig in [deltaMaxLow, deltaMaxHigh]
    // Si Min: cOrig = -cMax => deltaOrig = -deltaMax => in [-deltaMaxHigh, -deltaMaxLow]
    const dOrigLow = isMax ? deltaMaxLow : deltaMaxHigh ? deltaMaxHigh.neg() : null;
    const dOrigHigh = isMax ? deltaMaxHigh : deltaMaxLow ? deltaMaxLow.neg() : null;

    const cMin = dOrigLow !== null ? cOrig[j].add(dOrigLow).toString() : null;
    const cMaxVal = dOrigHigh !== null ? cOrig[j].add(dOrigHigh).toString() : null;
    const allowableDec = dOrigLow !== null ? dOrigLow.neg().toString() : null;
    const allowableInc = dOrigHigh !== null ? dOrigHigh.toString() : null;

    return {
      name: `x${j + 1}`,
      originalC: cOrig[j].toString(),
      optValue: result.x![j]?.value ?? "0",
      reducedCost: isBasic ? "0" : rc.toString(),
      isBasic,
      cMin,
      cMax: cMaxVal,
      allowableDec,
      allowableInc,
    };
  });

  // 2. Sensibilidad de los lados derechos b_i (i = 0..m-1)
  const constraints: ConSensitivity[] = problem.constraints.map((con, i) => {
    const bOrig = Frac.parse(con.b);
    // Si la fila se multiplicó por -1 al normalizar (b < 0), un incremento +Delta en b_original
    // equivale a -Delta en b_normalizado.
    const signFactor = rowFlip[i] ? new Frac(-1n) : new Frac(1n);
    // Precio sombra dZ / db_orig:
    // En forma Max: dZ_max / db_norm = yMax[i].
    // Para Z original: si Min, Z = -Z_max.
    const zSign = isMax ? new Frac(1n) : new Frac(-1n);
    const shadow = yMax[i].mul(zSign).mul(signFactor);

    // Rango de factibilidad para deltaOrig en b_original:
    // xB + deltaOrig * signFactor * Binv[:, i] >= 0
    let dLow: Frac | null = null;
    let dHigh: Frac | null = null;
    for (let r = 0; r < m; r++) {
      const colCoeff = Binv[r][i].mul(signFactor);
      if (colCoeff.isZero()) continue;
      // deltaOrig * colCoeff >= -xB[r]
      const bound = xB[r].neg().div(colCoeff);
      if (colCoeff.isPos()) {
        if (dLow === null || bound.gt(dLow)) dLow = bound;
      } else {
        if (dHigh === null || bound.lt(dHigh)) dHigh = bound;
      }
    }

    const cOut = result.constraints?.[i];
    return {
      index: i + 1,
      name: `R${i + 1}`,
      op: con.op,
      originalB: bOrig.toString(),
      lhsValue: cOut?.lhs ?? "0",
      slackValue: cOut?.slack ?? "0",
      binding: cOut?.binding ?? false,
      shadowPrice: shadow.toString(),
      bMin: dLow !== null ? bOrig.add(dLow).toString() : null,
      bMax: dHigh !== null ? bOrig.add(dHigh).toString() : null,
      allowableDec: dLow !== null ? dLow.neg().toString() : null,
      allowableInc: dHigh !== null ? dHigh.toString() : null,
    };
  });

  return {
    variables,
    constraints,
    binv: Binv.map((r) => r.map((v) => v.toString())),
    basisNames: result.final_basis,
  };
}
