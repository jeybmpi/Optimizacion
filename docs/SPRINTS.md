# Avance del proyecto por sprints

Documento único de seguimiento. Cada sprint queda como registro; la sección **Estado actual** resume dónde está el proyecto hoy.

| Sprint | Objetivo | Estado |
|---|---|---|
| 1 | Mostrar avance y mostrar qué falta | ✅ Cerrado |
| 2 | Proyecto casi terminado | ✅ Cerrado |
| 3 | Entrega y sustentación | 🟡 En curso (ver [Pendientes](#sprint-3--entrega-pendientes)) |

---

## Estado actual (resumen)

### Rúbrica de la entrega 1

| Criterio (peso) | Estado | Detalle |
|---|---|---|
| 1. Entrada y validación (10 %) | ✅ | Max/Min, n y m dinámicos (hasta 20), ≤ ≥ =, lados derechos negativos, fracciones/decimales; validación por campo en cliente y servidor |
| 2. Método propio (15 %) | ✅ | Gran M **y** simplex revisado, a elección del usuario. Los 7 problemas del enunciado correctos con ambos métodos; verificación cruzada con scipy (solo para validar) sin discrepancias |
| 3. Paso a paso (25 %) | ✅ | Forma estándar, y por iteración: variable entrante, razón mínima, saliente, pivote y tablero (o B⁻¹, x_B, y y costos reducidos en el revisado), con la justificación de cada decisión y fracciones legibles. Pendiente solo pulido de textos |
| 4. Método gráfico (20 %) | ✅ | Región factible sombreada, restricciones rotuladas, vértices con su Z, recta de isoutilidad en el óptimo, escala con marcas redondas, mensajes de región vacía y no acotada, segmento para restricciones de igualdad, aviso cuando n > 2 |
| 5. Sensibilidad (15 %) | ✅ | Precios sombra, costos reducidos, rangos de cada bᵢ y de cada cⱼ, interpretación en texto y avisos de degeneración y óptimos múltiples |
| 6. Interfaz (15 %) | 🟡 | Agregar/quitar variables y restricciones, editar y re-resolver sin reiniciar, resultados en pestañas, mensajes de error claros. **Falta revisar usabilidad en móvil** |
| Casos especiales | ✅ | Infactible, no acotado, múltiples óptimos y degenerado, con mensaje claro y sin errores del programa |

### Bonos (máximo +0.5 en total; solo cuentan si lo obligatorio funciona)

| Bono | Estado |
|---|---|
| Los dos métodos y comparación de iteraciones (+0.2) | ✅ Pestaña «Comparar métodos» |
| Fracciones exactas en todo el paso a paso (+0.1) | ✅ |
| Exportar la solución a PDF (+0.1) | ✅ Reporte completo (ver Sprint 2) |
| Cargar y guardar problemas en JSON (+0.1) | ✅ (CSV no implementado; el enunciado dice «JSON o CSV») |
| Elegir «decimales o enteros» (+0.1) | 🟡 Ambiguo: hoy se puede elegir entre **fracciones y decimales**. Si el docente se refiere a **variables enteras** (programación entera), no está implementado |

Con los cuatro primeros ya se alcanza el tope de +0.5.

---

## Sprint 1 — Avance y pendientes (cerrado)

### Propuesta (Semana 1)
- **Métodos:** Gran M (tablero) y simplex revisado (B⁻¹), a elección del usuario, con fracciones exactas.
- **Stack:** TypeScript + React · Python (Vercel Functions) · Supabase · Vercel.
- **Decisión de arquitectura:** el cálculo vive en Python (`api/_solver`), la interfaz solo muestra; así el método es propio y comprobable con `pytest`.
- **Boceto de interfaz:** columna izquierda = modelo editable (variables/restricciones dinámicas, ejemplos, guardar/abrir); derecha = estado (banner) + pestañas Solución · Paso a paso · Método gráfico · Sensibilidad.

### Estado al cierre del Sprint 1
| Criterio (peso) | Estado | Detalle |
|---|---|---|
| 1. Entrada y validación (10 %) | ✅ Hecho | Max/Min, n y m dinámicos (hasta 20), ≤ ≥ =, lados derechos negativos, fracciones/decimales; validación en cliente y servidor con mensajes por campo |
| 2. Método (15 %) | ✅ Hecho | Gran M y simplex revisado, el usuario elige en la interfaz. Los 7 problemas del enunciado correctos; 1500 problemas aleatorios coinciden con scipy |
| 3. Paso a paso (25 %) | 🟡 ~90 % | Forma estándar, tableros, entrante/razón mínima/saliente/pivote, operaciones de renglón, fracciones/decimales. Faltaba pulir textos y exportar PDF |
| 4. Método gráfico (20 %) | ⬜ Pendiente | Solo detectaba n > 2 y avisaba |
| 5. Sensibilidad (15 %) | ⬜ Pendiente | — |
| 6. Interfaz (15 %) | 🟡 ~75 % | Agregar/quitar, editar y re-resolver sin reiniciar, secciones claras. Faltaba revisión en móvil |
| Casos especiales | ✅ | Infactible, no acotado, múltiples, degenerado con mensaje claro |

### Backlog que se planteó para el Sprint 2
1. Método gráfico (SVG): vértices por intersección de pares de rectas (incluye x₁=0, x₂=0), filtrar factibles, polígono sombreado, recta de isoutilidad en el óptimo, regiones no acotadas/vacías, escala automática.
2. Sensibilidad: precios sombra y costos reducidos desde el renglón (0) final; rangos de b (B⁻¹b ≥ 0, ver Clase 12) y de c; interpretación en texto.
3. Vista de comparación Gran M vs revisado; pulir paso a paso; exportar a PDF.
4. Variables libres (x sin restricción de signo) como mejora opcional.

---

## Sprint 2 — Casi terminado (cerrado)

### Qué se hizo

**Método gráfico** (`src/components/GraphicalMethod.tsx`)
- Vértices por intersección de todos los pares de rectas, filtrado de factibles, polígono sombreado, recta de isoutilidad en el óptimo y tabla de vértices con su Z.
- Región vacía y región no acotada con mensaje propio; para igualdades la región se dibuja como segmento; con óptimos múltiples se avisa.
- Rótulo con Z en cada vértice factible; marcas de los ejes «redondas» (0, 20, 40…) en lugar de valores como 1.3 o 5.1.

**Análisis de sensibilidad** (`src/lib/sensitivity.ts`, `src/components/Sensitivity.tsx`)
- Precios sombra, costos reducidos, rango de cada bᵢ (B⁻¹b ≥ 0) y de cada cⱼ, con interpretación en texto.
- **Degeneración:** cuando un extremo del intervalo de bᵢ coincide con el valor actual, el precio sombra no es único y solo vale hacia un lado. Esas filas se marcan «⚠ no único» y muestran la variación real de Z hacia cada lado (`src/lib/lateral.ts`, re-resolviendo con el solver propio en bᵢ ± 0.001).
- **Óptimos múltiples:** la variable no básica con costo reducido 0 se marca «⚠ óptimo alternativo» y se muestra la otra solución óptima.
- Comprobación de rangos y precios sombra re-resolviendo el problema en los extremos de cada intervalo (problemas 1, 2 y 3 del enunciado, el Wyndor y el ejemplo de la Clase 12).

**Corrección de consistencia**
- El gráfico y la sensibilidad usaban el formulario en edición. Ahora usan una copia del problema **tal como se resolvió**, y si el modelo cambia después aparece un aviso de que los resultados corresponden al problema anterior.

**Comparación de métodos** (`src/components/MethodComparison.tsx`)
- Resuelve con Gran M y con simplex revisado y muestra: si coinciden en Z y x*, si recorren los mismos vértices, iteraciones, el paso previo propio de Gran M (eliminar M del renglón 0), tamaño de lo que se actualiza por iteración, y la tabla de pivoteos lado a lado.

**Exportar PDF completo** (`src/components/PrintReport.tsx`)
- El botón «Exportar PDF completo» arma un reporte con: modelo, solución, paso a paso, método gráfico, sensibilidad y comparación de métodos. Se guarda con «Guardar como PDF» del diálogo de impresión (A4 horizontal).
- Revisado generando PDF reales para los ejemplos 1 y 2 (11 y 12 páginas).

### Verificación al cierre del Sprint 2
- `npm run test:py`: **32** pruebas.
- `npm test`: **21** pruebas de interfaz (requieren `npm run api` activo).
- Verificación cruzada con scipy sobre **400 problemas aleatorios** (2–5 variables, 2–6 restricciones, ≤ ≥ =, lados derechos negativos, Max/Min), con ambos métodos: **0 discrepancias** en estado y Z, y la x entregada cumple todas las restricciones. El script del equipo es `tests/fuzz_vs_scipy.py`.

---

## Sprint 3 — Entrega (pendientes)

Obligatorio para la entrega:
- [ ] **Despliegue en Vercel** y probar la URL completa (la app debe ejecutar en la sustentación o en la URL entregada). Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` si se usa «Problemas en la nube».
- [ ] **README final** con requisitos, instalación, ejecución y la **URL** de la app.
- [ ] **Repositorio** (GitHub/GitLab) con el historial de commits de los tres integrantes.
- [ ] **Manual de usuario** (≤ 5 páginas) con capturas de **dos problemas resueltos**.
- [ ] **Video de demostración** (≤ 5 minutos).
- [ ] **Ensayo de sustentación** (15 min por equipo): cada integrante explica una parte del código elegida por el docente y el equipo resuelve en vivo un problema que no conoce.

Mejoras opcionales (sin peso en la nota):
- [ ] Variables libres (x sin restricción de signo).
- [ ] Etiquetas R1/R2 del gráfico que a veces se montan sobre el vértice óptimo.
- [ ] Revisión de usabilidad en móvil.
- [ ] Pruebas automáticas de la importación de JSON malformado.
- [ ] Exportar/cargar CSV.

### Reparto sugerido (3 personas; todos deben poder explicar todo el código)
| Persona | Responsable | Debe entender también |
|---|---|---|
| A | Solver: `bigm.py`, `revised.py`, validación, pruebas | Cómo lo consume la UI |
| B | Interfaz y paso a paso: `src/` | Formato del JSON del solver |
| C | Gráfico, sensibilidad, despliegue, Supabase | Tablero final y B⁻¹ |

Rotar revisiones de código: cada quien explica en voz alta una parte que no escribió. Para la sustentación conviene que los tres puedan explicar `bigm.py`, `revised.py`, `sensitivity.ts` y `GraphicalMethod.tsx`.

---

## Limitaciones conocidas
- Variables solo con x ≥ 0 (como en los ejemplos del enunciado).
- Con degeneración o óptimos múltiples, los rangos de cⱼ corresponden a la base final encontrada; otra base óptima tendría rangos distintos. Las pendientes laterales de bᵢ se calculan con Δ = 0.001, que es exacto salvo que un punto de quiebre esté más cerca que eso.
- El PDF se genera con «Guardar como PDF» del navegador, no es una descarga directa.
- Supabase: la política actual permite que cualquiera con la clave pública lea e inserte problemas (demo del curso).
