import type { Method, ProblemIn, SolveResult } from "../types";

export async function solve(p: ProblemIn, withSteps: boolean, method: Method = "bigm"): Promise<SolveResult> {
  try {
    const res = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, with_steps: withSteps, method }),
    });
    return (await res.json()) as SolveResult;
  } catch {
    return {
      status: "error",
      message:
        "No se pudo conectar con el servidor de cálculo. Si trabajas en local, inicia la API con «npm run api».",
    };
  }
}
