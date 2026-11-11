import type { Cell, NumMode } from "../types";

function toNumber(s: string): number {
  const [n, d] = s.split("/");
  return d ? Number(n) / Number(d) : Number(n);
}

export function minus(s: string): string {
  return s.startsWith("-") ? "−" + s.slice(1) : s;
}

/** Decimal con hasta `digits` cifras, sin ceros sobrantes. */
export function dec(s: string, digits = 4): string {
  const v = toNumber(s);
  if (!Number.isFinite(v)) return s;
  let t = v.toFixed(digits);
  if (t.includes(".")) t = t.replace(/0+$/, "").replace(/\.$/, "");
  return t === "-0" || t === "" ? "0" : t;
}

export const isFraction = (s: string) => s.includes("/");

export function num(s: string, mode: NumMode): string {
  return minus(mode === "frac" ? s : dec(s));
}

/** Celda del tablero con M: '−2M + 5', 'M', '3/2'. */
export function cellText([re, m]: Cell, mode: NumMode): string {
  const r = mode === "frac" ? re : dec(re);
  const k = mode === "frac" ? m : dec(m);
  if (k === "0") return minus(r);
  const mp = k === "1" ? "M" : k === "-1" ? "−M" : `${minus(k)}M`;
  if (r === "0") return mp;
  return r.startsWith("-") ? `${mp} − ${r.slice(1)}` : `${mp} + ${r}`;
}
