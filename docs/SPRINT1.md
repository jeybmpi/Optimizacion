# Sprint 1 — Avance y pendientes

## Propuesta (Semana 1)
- **Métodos:** Gran M (tablero) y simplex revisado (B⁻¹), a elección del usuario, con fracciones exactas.
- **Stack:** TypeScript + React · Python (Vercel Functions) · Supabase · Vercel.
- **Decisión de arquitectura:** el cálculo vive en Python (`api/_solver`), la interfaz solo muestra; así el método es propio y comprobable con `pytest`.
- **Boceto de interfaz:** columna izquierda = modelo editable (variables/restricciones dinámicas, ejemplos, guardar/abrir); derecha = estado (banner) + pestañas Solución · Paso a paso · Método gráfico · Sensibilidad.

## Estado frente a la rúbrica
| Criterio (peso) | Estado | Detalle |
|---|---|---|
| 1. Entrada y validación (10 %) | ✅ Hecho | Max/Min, n y m dinámicos (hasta 20), ≤ ≥ =, lados derechos negativos, fracciones/decimales; validación en cliente y servidor con mensajes por campo |
| 2. Método (15 %) | ✅ Hecho | Gran M **y simplex revisado**, el usuario elige en la interfaz. Los 7 problemas del enunciado correctos; 1500 problemas aleatorios coinciden con scipy |
| 3. Paso a paso (25 %) | 🟡 ~90 % | Forma estándar, tableros, entrante/razón mínima/saliente/pivote, operaciones de renglón, fracciones/decimales. Falta pulir textos y exportar PDF |
| 4. Método gráfico (20 %) | ⬜ Pendiente | Hoy solo detecta n > 2 y avisa. Sprint 2 |
| 5. Sensibilidad (15 %) | ⬜ Pendiente | Sprint 2 |
| 6. Interfaz (15 %) | 🟡 ~75 % | Agregar/quitar, editar y re-resolver sin reiniciar, secciones claras. Falta revisión de usabilidad en móvil |
| Casos especiales | ✅ | Infactible, no acotado, múltiples, degenerado con mensaje claro |

**Bonos ya cubiertos:** fracciones exactas (+0.1), elegir fracciones/decimales (+0.1), guardar/cargar JSON (+0.1). Implementados los dos métodos; para el +0.2 falta la vista que **compara sus iteraciones** (Sprint 2/3). Pendiente: PDF (+0.1).

## Backlog Sprint 2
1. **Método gráfico (SVG):** vértices por intersección de pares de rectas (incluye x₁=0, x₂=0), filtrar factibles, polígono sombreado, recta de isoutilidad en el óptimo, regiones no acotadas/vacías, escala automática.
2. **Sensibilidad:** precios sombra y costos reducidos desde el renglón (0) final; rangos de b (B⁻¹b ≥ 0, ver Clase 12) y de c (costos reducidos ≥ 0); interpretación en texto. Se requiere extraer B⁻¹ de las columnas de holgura/artificiales iniciales.
3. Vista de comparación Gran M vs revisado (nº de iteraciones, variables que entran/salen); pulir paso a paso; exportar a PDF.
4. Variables libres (x sin restricción de signo) como mejora opcional.

## Sprint 3
Manual de usuario (≤ 5 págs.), video (≤ 5 min), README final, ensayo de sustentación.

## Reparto sugerido (3 personas; todos deben poder explicar todo el código)
| Persona | Responsable | Debe entender también |
|---|---|---|
| A | Solver: `bigm.py`, validación, pruebas | Cómo lo consume la UI |
| B | Interfaz y paso a paso: `src/` | Formato del JSON del solver |
| C | Gráfico (Sprint 2), sensibilidad, despliegue, Supabase | Tablero final y B⁻¹ |

Rotar revisiones de código: cada quien explica en voz alta una parte que no escribió.

## Limitaciones conocidas
- Variables solo con x ≥ 0 (como en los ejemplos del enunciado).
- Óptimos múltiples: se detecta una arista adyacente; en casos muy degenerados podría no detectarse.
