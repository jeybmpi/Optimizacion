export type Op = "<=" | ">=" | "=";
export type Sense = "max" | "min";
export type NumMode = "frac" | "dec";
export type ViewMode = "direct" | "steps";
export type Method = "bigm" | "revised";

export interface ConstraintIn {
  a: string[];
  op: Op;
  b: string;
}
export interface ProblemIn {
  sense: Sense;
  c: string[];
  constraints: ConstraintIn[];
}

/** Celda exacta del tablero: [parte real, coeficiente de M], ambos como fracción en texto. */
export type Cell = [string, string];

export interface Ratio {
  row: number;
  basic: string;
  num?: string;
  den?: string | null;
  ratio: string | null;
}
export interface Iteration {
  k: number;
  title: string;
  columns: string[];
  basis: string[];
  rows: Cell[][];
  pre_ops?: string[];
  decision?: string[];
  entering?: { col: number; name: string; value?: Cell };
  ratios?: Ratio[];
  leaving?: { row: number; name: string };
  pivot?: { row: number; col: number; value: string };
  ops?: string[];
  // Simplex revisado
  method?: "revised";
  binv?: string[][];
  xb?: string[];
  y?: Cell[];
  rc?: { name: string; value: Cell }[];
  z?: Cell;
  d?: string[];
}
export interface StandardForm {
  original_objective: string;
  objective: string;
  equation0: string;
  equations: string[];
  notes: string[];
  has_artificial: boolean;
  z_name: string;
}
export interface ConstraintOut {
  lhs: string;
  op: Op;
  rhs: string;
  slack: string;
  kind: "holgura" | "exceso" | "igualdad";
  binding: boolean;
}
export interface SolveResult {
  status: "optimal" | "infeasible" | "unbounded" | "invalid" | "error";
  message?: string;
  errors?: string[];
  standard_form?: StandardForm;
  columns?: string[];
  kinds?: string[];
  iterations?: Iteration[];
  n_iterations?: number;
  z?: string;
  x?: { name: string; value: string }[];
  constraints?: ConstraintOut[];
  degenerate?: boolean;
  zero_basic?: string[];
  multiple?: boolean;
  alt?: { ray: boolean; var: string; x?: string[] } | null;
  final_basis?: string[];
  method?: Method;
  sense?: Sense;
  n?: number;
  m?: number;
}
