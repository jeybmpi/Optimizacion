# Simplex paso a paso (Gran M)

Aplicación web que resuelve problemas de programación lineal y muestra el proceso completo. El usuario elige el método: **Gran M** (simplex tabular) o **simplex revisado** (con B⁻¹). Ambos son propios del equipo, con aritmética exacta con fracciones y M simbólica.

**Stack:** TypeScript + React (Vite) · Python (función serverless) · Supabase (guardado opcional) · Vercel.

## Requisitos
- Node 18+ y Python 3.9+ (el solver no usa librerías externas).

## Ejecutar en local
```bash
npm install
npm run api      # terminal 1: API Python en http://127.0.0.1:8000
npm run dev      # terminal 2: interfaz en http://localhost:5173 (proxy /api → :8000)
```

## Pruebas
```bash
npm run test:py                 # 32 pruebas (los 7 problemas del enunciado + validación, para ambos métodos)
python tests/fuzz_vs_scipy.py [bigm|revised]   # verificación cruzada con scipy (pip install scipy numpy); solo valida, no produce resultados
npm test                        # pruebas de interfaz (requiere `npm run api` activo)
```

## Despliegue en Vercel
1. Subir el repositorio a GitHub e importarlo en Vercel (detecta Vite y `api/solve.py` automáticamente; `vercel.json` ya incluye `api/_solver`).
2. (Opcional) Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; ejecutar `supabase/schema.sql` en Supabase. Sin ellas la app funciona igual, solo se oculta «Problemas en la nube».

## Estructura
```
api/solve.py          endpoint POST /api/solve (Vercel)
api/_solver/          mnum.py (M simbólica) · bigm.py (Gran M) · revised.py (simplex revisado) · validate.py · fmt.py · api.py
src/                  interfaz React: ProblemForm, Tableau, StepByStep, Solution
tests/                pruebas Python y verificación cruzada
docs/SPRINT1.md       propuesta, estado y pendientes
```

## Cómo funcionan los métodos
**Simplex revisado:** mantiene B⁻¹ explícita; en cada iteración calcula x_B = B⁻¹b, y = c_B B⁻¹, costos reducidos z_j − c_j = y·A_j − c_j, la dirección d = B⁻¹A_j y la razón mínima, y actualiza B⁻¹ con operaciones de renglón. Usa los mismos costos con M simbólica para ≥ y =.

**Gran M:**
Los números del tablero son `a + b·M` con `a, b` fracciones exactas; se comparan primero por `b` y luego por `a`. Nunca se sustituye M por 1e6. Infactibilidad = artificial positiva al terminar; no acotado = columna entrante sin elementos positivos (si hay artificiales se verifica antes que el problema sea factible); óptimos múltiples = variable no básica con costo reducido 0 que lleva a otro vértice; degeneración = variable básica en 0.
