import { useState } from "react";
import type { ProblemIn } from "../types";
import { listProblems, saveProblem, type SavedProblem } from "../lib/cloud";

export default function CloudPanel({ problem, onLoad }: { problem: ProblemIn; onLoad: (p: ProblemIn) => void }) {
  const [name, setName] = useState("");
  const [items, setItems] = useState<SavedProblem[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    const { data, error } = await listProblems();
    setItems(data);
    setMsg(error);
  };
  const save = async () => {
    if (!name.trim()) return setMsg("Escribe un nombre para guardar el problema.");
    const error = await saveProblem(name.trim(), problem);
    setMsg(error ?? "Guardado en la nube.");
    if (!error) {
      setName("");
      void refresh();
    }
  };

  return (
    <details className="cloud" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && void refresh()}>
      <summary>Problemas en la nube</summary>
      <div className="cloud-body">
        <div className="inline">
          <input value={name} placeholder="Nombre del problema" aria-label="Nombre del problema" onChange={(e) => setName(e.target.value)} />
          <button type="button" className="ghost" onClick={save}>
            Guardar
          </button>
        </div>
        {msg && <p className="hint">{msg}</p>}
        {items && items.length === 0 && !msg && <p className="hint">Aún no hay problemas guardados.</p>}
        <ul className="saved">
          {items?.map((it) => (
            <li key={it.id}>
              <button type="button" className="link" onClick={() => onLoad(it.problem)}>
                {it.name}
              </button>
              <span className="muted">{new Date(it.created_at).toLocaleDateString("es-CO")}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
