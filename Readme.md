# Solucionador de Programación Lineal (Gran M y Simplex Revisado)

Aplicación web que resuelve problemas de programación lineal y **muestra el proceso completo**, no solo la respuesta. El usuario elige el método —**Gran M** (simplex tabular) o **simplex revisado** (con B⁻¹)— y el modo de solución: directa o paso a paso. Ambos métodos son **propios del equipo**, con aritmética exacta con fracciones y M simbólica. Ninguna librería de optimización produce resultados; scipy se usa solo para verificar en las pruebas.

**URL de la aplicación:** _[pegar aquí la URL de Vercel]_ · **Repositorio:** _[pegar aquí la URL del repositorio]_
**Equipo:** _[nombres de los 3 integrantes]_ · Investigación de Operaciones I

**Stack:** TypeScript + React (Vite) · Python (función serverless) · Supabase (guardado opcional) · Vercel.

## Qué hace

| Funcionalidad | Dónde |
|---|---|
| Entrada del modelo: Max/Min, hasta 20 variables y 20 restricciones, ≤ ≥ =, lados derechos de cualquier signo. Agregar/quitar variables y restricciones, editar y re-resolver sin reiniciar | Panel izquierdo |
| Validación: campos vacíos, valores no numéricos, dimensiones inconsistentes, con mensaje por campo (en la interfaz y en el servidor) | Panel izquierdo |
| Dos modos: **solución directa** y **paso a paso** | Botones «Resolver» |
| Paso a paso: forma estándar con holguras, excesos y artificiales; por iteración, variable entrante, razón mínima, saliente, pivote y tablero (o B⁻¹, x_B, y y costos reducidos en el revisado), con la justificación de cada decisión | Pestaña «Paso a paso» |
| Solución: valor de cada variable, Z y holgura o exceso de cada restricción | Pestaña «Solución» |
| **Método gráfico** (2 variables): región factible, vértices con su Z, recta de isoutilidad en el óptimo. Con más de 2 variables avisa que no aplica | Pestaña «Método gráfico» |
| **Sensibilidad**: precios sombra, costos reducidos, rango de cada cⱼ y de cada bᵢ, con interpretación | Pestaña «Sensibilidad» |
| Casos especiales con mensaje claro: infactible, no acotado, óptimos múltiples, degenerado | Banner de estado |
| **Comparación** Gran M vs simplex revisado, iteración por iteración | Pestaña «Comparar métodos» |
| **PDF completo** (modelo, solución, paso a paso, gráfico, sensibilidad, comparación) | Botón «Exportar PDF completo» |
| Guardar y cargar problemas en **JSON**; ejemplos precargados; fracciones exactas o decimales | Panel izquierdo |
| Problemas en la nube (Supabase), opcional | Panel «Problemas en la nube» |

## Requisitos
- Node 18+ y Python 3.9+. El solver no usa librerías externas de Python (`requirements.txt` está vacío a propósito).
- Para la verificación cruzada opcional: `pip install scipy numpy`.

## Instalación y ejecución en local
```bash
npm install
npm run api      # terminal 1: API Python en http://127.0.0.1:8000
npm run dev      # terminal 2: interfaz en http://localhost:5173 (proxy /api → :8000)
```
Si la interfaz muestra un error de conexión al resolver, casi siempre es que `npm run api` no está corriendo.

## Uso rápido
1. En «Cargar un ejemplo» elige uno de los problemas precargados (los 7 del enunciado y el Wyndor) o escribe el tuyo.
2. Elige el método (Gran M o simplex revisado) y el modo de números (fracciones o decimales).
3. Pulsa **Resolver** o **Resolver paso a paso**.
4. Revisa las pestañas de resultados. Si cambias el modelo después de resolver, aparece un aviso: los resultados corresponden al problema anterior hasta que vuelvas a resolver.
5. «Exportar PDF completo» abre el diálogo de impresión: elige **Guardar como PDF**.

## Pruebas
```bash
npm run test:py                                  # 32 pruebas Python: los 7 problemas del enunciado + validación, para ambos métodos
npm test                                         # 21 pruebas de interfaz (requiere `npm run api` activo)
python tests/fuzz_vs_scipy.py [bigm|revised]     # 1500 problemas aleatorios contra scipy; solo valida, no produce resultados
```

## Despliegue en Vercel
1. Subir el repositorio a GitHub e importarlo en Vercel (detecta Vite y `api/solve.py` automáticamente; `vercel.json` ya incluye `api/_solver`).
2. (Opcional) Guardado en la nube: copiar `.env.example`, cargar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Vercel › Settings › Environment Variables y ejecutar `supabase/schema.sql` en el SQL Editor de Supabase. Sin ellas la app funciona igual; solo se oculta «Problemas en la nube».
3. Probar la URL con los 7 problemas del enunciado antes de la sustentación.

## Estructura
```
api/solve.py          endpoint POST /api/solve (Vercel)
api/_solver/          mnum.py (M simbólica) · bigm.py (Gran M) · revised.py (simplex revisado)
                      validate.py · fmt.py · api.py
src/App.tsx           estado general, pestañas y exportación a PDF
src/components/       ProblemForm · Solution · StepByStep · Tableau · RevisedSteps
                      GraphicalMethod · Sensitivity · MethodComparison · PrintReport · CloudPanel
src/lib/              api.ts · validate.ts · numfmt.ts · examples.ts
                      sensitivity.ts (análisis de sensibilidad) · lateral.ts (precios sombra por lado) · cloud.ts
supabase/schema.sql   tabla de problemas guardados
tests/                pruebas Python y verificación cruzada con scipy
docs/SPRINTS.md       seguimiento por sprints: propuesta, avance, estado actual y pendientes
```

## Cómo funcionan los métodos

**Gran M:** los números del tablero son `a + b·M` con `a, b` fracciones exactas; se comparan primero por `b` y luego por `a`. Nunca se sustituye M por 1e6. Infactibilidad = artificial positiva al terminar; no acotado = columna entrante sin elementos positivos (si hay artificiales se verifica antes que el problema sea factible); óptimos múltiples = variable no básica con costo reducido 0 que lleva a otro vértice; degeneración = variable básica en 0.

**Simplex revisado:** mantiene B⁻¹ explícita; en cada iteración calcula x_B = B⁻¹b, y = c_B B⁻¹, costos reducidos z_j − c_j = y·A_j − c_j, la dirección d = B⁻¹A_j y la razón mínima, y actualiza B⁻¹ con operaciones de renglón. Usa los mismos costos con M simbólica para ≥ y =.

**Comparación:** resuelve el mismo problema con los dos métodos y contrasta estado, Z*, x*, iteraciones y, en cada iteración, variable entrante, saliente, pivote y Z. Con la misma regla de entrada y la misma razón mínima ambos recorren los mismos vértices; lo que cambia es cómo se calculan los números (tablero completo vs B⁻¹).

**Método gráfico (n = 2):** los vértices son las intersecciones de todos los pares de rectas (incluidos los ejes); se filtran los factibles, se ordena el polígono, se calcula Z en cada vértice y se traza la recta de isoutilidad en el óptimo. Una región vacía o no acotada se avisa con mensaje propio; una restricción de igualdad hace que la región sea un segmento.

**Sensibilidad:** parte de la base final. Precio sombra de la restricción i: yᵢ = c_B B⁻¹ eᵢ. Rango de bᵢ: valores para los que B⁻¹(b + Δeᵢ) ≥ 0, es decir, para los que la base sigue siendo factible. Rango de cⱼ: para una variable no básica, el límite lo da su costo reducido; para una básica se recalcula el renglón (0) con c_B variable. Con degeneración un extremo del intervalo de bᵢ coincide con el valor actual y el precio sombra deja de ser único: esas filas se marcan y se muestra la variación real de Z hacia cada lado (calculada re-resolviendo con el solver propio en bᵢ ± 0.001).

## Bonificaciones implementadas
- Los dos métodos (Gran M y simplex revisado) y comparación de sus iteraciones.
- Fracciones exactas en todo el paso a paso; selector fracciones/decimales.
- Exportar la solución a PDF (reporte completo).
- Cargar y guardar problemas en JSON.

## Limitaciones conocidas
- Variables solo con x ≥ 0 (como en los ejemplos del enunciado).
- Con degeneración o con óptimos múltiples, los rangos de cⱼ corresponden a la base final encontrada; otra base óptima tendría rangos distintos. Las pendientes laterales de bᵢ usan Δ = 0.001, exacto salvo que un punto de quiebre esté más cerca que eso.
- El PDF se genera con «Guardar como PDF» del navegador, no es una descarga directa.
- Supabase: la política actual permite que cualquiera con la clave pública lea e inserte problemas (demo del curso; ver `supabase/schema.sql`).

## Referencias y créditos
- Hillier, F. y Lieberman, G. *Introducción a la investigación de operaciones*. McGraw-Hill. De aquí viene el problema prototipo de la Wyndor Glass Co.
- Taha, H. *Investigación de operaciones*, 9.ª ed. Pearson.
- Material de clase de Investigación de Operaciones I (Universidad de Antioquia, prof. Ronald A. Ortiz): Clases 2, 3, 5, 9, 10, 11 y 12 (formulación, simplex algebraico y tabular, Gran M, simplex revisado y análisis de sensibilidad). Los documentos de clase son orientativos y contienen errores; los resultados se contrastaron con los problemas del enunciado y con scipy.
- scipy (`linprog`) se usa **solo** en `tests/fuzz_vs_scipy.py` para verificar resultados; nunca para producirlos.
- Herramientas de IA: se usaron como apoyo, según lo permite el enunciado. _[El equipo completa aquí qué partes y cómo se revisaron.]_
