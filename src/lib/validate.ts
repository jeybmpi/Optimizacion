import type { ProblemIn } from "../types";

export interface Validation {
  messages: string[];
  /** claves: 'c:j', 'a:i:j', 'b:i' */
  cells: Record<string, string>;
}

export const MAX_N = 20;
export const MAX_M = 20;

const NUM = /^[+-]?(\d+([.,]\d+)?|[.,]\d+)(\/\d+([.,]\d+)?)?$/;

/** Devuelve null si es válido, o el motivo. */
export function checkNumber(raw: string): string | null {
  const s = raw.trim();
  if (s === "") return "Está vacío";
  if (!NUM.test(s)) return "No es un número (usa 3, -2.5 o 3/4)";
  const den = s.split("/")[1];
  if (den !== undefined && Number(den.replace(",", ".")) === 0) return "División por cero";
  return null;
}

export function validateProblem(p: ProblemIn): Validation {
  const cells: Record<string, string> = {};
  const messages: string[] = [];
  const n = p.c.length;

  if (n < 1) messages.push("Agrega al menos una variable.");
  if (p.constraints.length < 1) messages.push("Agrega al menos una restricción.");
  if (n > MAX_N) messages.push(`Máximo ${MAX_N} variables.`);
  if (p.constraints.length > MAX_M) messages.push(`Máximo ${MAX_M} restricciones.`);

  p.c.forEach((v, j) => {
    const e = checkNumber(v);
    if (e) {
      cells[`c:${j}`] = e;
      messages.push(`Función objetivo, x${j + 1}: ${e.toLowerCase()}.`);
    }
  });
  p.constraints.forEach((r, i) => {
    if (r.a.length !== n) {
      messages.push(`Restricción ${i + 1}: tiene ${r.a.length} coeficientes y el problema ${n} variables.`);
      return;
    }
    r.a.forEach((v, j) => {
      const e = checkNumber(v);
      if (e) {
        cells[`a:${i}:${j}`] = e;
        messages.push(`Restricción ${i + 1}, x${j + 1}: ${e.toLowerCase()}.`);
      }
    });
    const e = checkNumber(r.b);
    if (e) {
      cells[`b:${i}`] = e;
      messages.push(`Restricción ${i + 1}, lado derecho: ${e.toLowerCase()}.`);
    }
  });
  return { messages, cells };
}
