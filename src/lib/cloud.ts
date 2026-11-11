import { createClient } from "@supabase/supabase-js";
import type { ProblemIn } from "../types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const client = url && key ? createClient(url, key) : null;

export const cloudEnabled = client !== null;

export interface SavedProblem {
  id: string;
  name: string;
  problem: ProblemIn;
  created_at: string;
}

export async function saveProblem(name: string, problem: ProblemIn): Promise<string | null> {
  if (!client) return "Supabase no está configurado.";
  const { error } = await client.from("problems").insert({ name, problem });
  return error ? error.message : null;
}

export async function listProblems(): Promise<{ data: SavedProblem[]; error: string | null }> {
  if (!client) return { data: [], error: "Supabase no está configurado." };
  const { data, error } = await client
    .from("problems")
    .select("id,name,problem,created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  return { data: (data as SavedProblem[]) ?? [], error: error ? error.message : null };
}
