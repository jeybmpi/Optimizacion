# Guía de Diseño e Integración: Animaciones Gráficas y Contrapartida Geométrica

Este documento especifica la arquitectura técnica, el mapeo matemático-geométrico y el diseño visual (siguiendo el sistema de diseño **FlowerPoint**) para integrar animaciones gráficas interactivas en una futura iteración del proyecto.

---

## 1. Principio Rector: Contrapartida Geométrica de cada Operación Algebraica

En programación lineal, cada operación aritmética o matricial del método Simplex tiene una interpretación geométrica exacta:

| Concepto Algebraico | Método | Contrapartida Gráfica / Geométrica |
|---|---|---|
| Número simbólico $a + bM$ con $a, b \in \mathbb{Q}$ | Gran M / Revisado | **Recta real no-arquimediana de doble escala:** un eje macroscópico donde cada múltiplo entero/racional $b \cdot M$ define una «isla» separada infinitamente de las demás, y una lupa microscópica que muestra el desplazamiento racional exacto $a = p/q$ dentro de esa isla. |
| Penalización $-M \cdot a_i$ (artificiales) | Gran M / Revisado | **Campo de fuerza / pendiente infinita:** fuera del semiespacio factible ($a_i > 0$), la función objetivo cae con pendiente $-M$, generando vectores de empuje perpendiculares hacia el hiperplano $a_i = 0$. |
| Elección de variable entrante ($z_j - c_j < 0$) | Gran M / Revisado | **Selección de arista de máximo ascenso:** en el vértice actual, las variables no básicas corresponden a las aristas que salen del vértice; se elige aquella cuya dirección forma un ángulo agudo con $\nabla Z$ de mayor tasa de mejora por unidad. |
| Prueba de la razón mínima $\theta = \min \{ \bar{b}_i / \bar{a}_{ij} : \bar{a}_{ij} > 0 \}$ | Gran M / Revisado | **Disparo de un rayo contra muros (hiperplanos):** al avanzar sobre la arista entrante desde $\theta = 0$, cada restricción con $\bar{a}_{ij} > 0$ corta al rayo a distancia $\theta_i$. Debemos frenar en el **primer muro** ($\theta_{\min}$) porque cruzarlo implicaría violar esa restricción (entrar en zona infactible). Las restricciones con $\bar{a}_{ij} \le 0$ son paralelas o se alejan del rayo. |
| Pivoteo de Gauss-Jordan ($R_r \leftarrow R_r \div a_{rj}$, $R_i \leftarrow R_i - a_{ij} R_r$) | Gran M (Tabular) | **Cambio de origen local de coordenadas:** traslada el origen del sistema de variables no básicas desde el vértice anterior $(x^{(k)})$ hasta el nuevo vértice adyacente $(x^{(k+1)})$. |
| Sistema $x_B = B^{-1}b$ y dirección $d = B^{-1}A_j$ | Simplex Revisado | **Transformación lineal en el espacio de recursos $\mathbb{R}^m$:** las columnas básicas $\vec{B}_1, \dots, \vec{B}_m$ forman una rejilla (paralelogramo en 2D). $x_B = B^{-1}b$ son las coordenadas del vector de recursos $\vec{b}$ en esa rejilla, y $\vec{d} = B^{-1}\vec{A}_j$ expresa la columna entrante en la base actual. |
| Precios sombra $y = c_B B^{-1}$ e intervalos $[b_i^{\min}, b_i^{\max}]$ | Sensibilidad y Dualidad | **Cono normal y traslación paralela de fronteras:** en el óptimo, $\nabla Z = \sum y_i \nabla R_i$ queda dentro del cono generado por las normales de las restricciones activas. Modificar $b_i$ desplaza paralelamente la pared $R_i$, deslizando el vértice óptimo hasta que choca con otro vértice en los extremos $b_i^{\min}$ y $b_i^{\max}$. |

---

## 2. Arquitectura de Componentes Propuesta

Para mantener el código modular y no sobrecargar las vistas principales, las animaciones deben encapsularse en tres componentes independientes dentro de `src/components/animations/`:

```
src/components/animations/
├── ArithmeticLab.tsx         # Laboratorio interactivo de 4 escenas SVG (nivel conceptual)
├── RayBarrierDiagram.tsx     # Gráfico 1D del rayo y barreras de razón mínima por iteración
└── SimplexTrajectory2D.tsx   # Reproductor paso a paso del camino de vértices sobre el SVG 2D
```

### 2.1. `RayBarrierDiagram.tsx` (Para cada iteración en `StepByStep.tsx`)
Consume directamente el objeto `Iteration` devuelto por `api/_solver`:
- **Datos de entrada (`Iteration`):**
  - `it.entering.name`: nombre de la variable que define el eje del rayo.
  - `it.ratios`: arreglo `{ row, basic, num, den, ratio }`.
  - `it.leaving`: `{ row, name }` que identifica el primer muro $\theta_{\min}$.
- **Representación SVG (`viewBox="0 0 460 135"`):**
  1. Dibuja una recta horizontal desde $\theta = 0$ hasta $\theta_{\max} = 1.2 \times \max_i(\theta_i)$.
  2. Colorea el fondo de $[0, \theta_{\min}]$ en verde suave (`--good-soft`, tramo factible de la arista) y $(\theta_{\min}, \theta_{\max}]$ en rojo suave (`--red-soft`, zona infactible que viola `it.leaving.name`).
  3. Traza una línea vertical (barrera) en cada $\theta_i > 0$ etiquetada con `${r.basic}: θ = ${r.ratio}`.
  4. Anima mediante `stroke-dasharray` / `stroke-dashoffset` una flecha desde $0$ que se detiene exactamente en $\theta_{\min}$.

### 2.2. `SimplexTrajectory2D.tsx` (Extensión de `GraphicalMethod.tsx` cuando $n = 2$)
Extrae la secuencia de vértices recorridos a partir de `result.iterations`:
- **Extracción de coordenadas $(x_1^{(k)}, x_2^{(k)})$ en cada iteración $k \ge 0$:**
  - Buscar `"x1"` y `"x2"` en `it.basis`:
    - En **Gran M**: si `"x1"` está en `it.basis[r]`, su valor es `it.rows[r][it.columns.length][0]`; si no está en la base, vale `0`.
    - En **Simplex Revisado**: si `"x1"` está en `it.basis[r]`, su valor es `it.xb[r]`; si no está en la base, vale `0`.
- **Animación sobre el plano $(x_1, x_2)$:**
  - Un estado `activeStep: number | "all"` permite reproducir con `setInterval` el avance desde $k = 0$ hasta la iteración óptima.
  - En cada paso $k$:
    - Se dibuja el vector flecha $(x_1^{(k-1)}, x_2^{(k-1)}) \to (x_1^{(k)}, x_2^{(k)})$ sobre el borde del polígono factible.
    - La recta de isoutilidad $c_1 x_1 + c_2 x_2 = Z^{(k)}$ se traslada paralelamente pasando por el vértice actual $(x_1^{(k)}, x_2^{(k)})$.

### 2.3. `ArithmeticLab.tsx` (Explicador interactivo por método)
Un carrusel controlado por pestañas (`Escala a + bM`, `Pivoteo Gauss-Jordan`, `Cambio de Base B⁻¹`, `Cono Dual y Sensibilidad`) sincronizado con el selector superior de método (`bigm` / `revised`):
- **Escena 1 (`a + bM`):** SVG con eje superior de islas $\{-7M, -3M, -M, 0, +M\}$, trapecio de zoom (`<polygon>`) hacia el eje inferior subdividido en fracciones exactas $p/q$, y vista de pared de penalización artificial.
- **Escena 2 (`Gran M`):** SVG dual con polígono 2D a la izquierda y vector columna pivote a la derecha mostrando cómo el pivote pasa a `1` y el resto de la columna a `0`.
- **Escena 3 (`Revisado B⁻¹`):** SVG en el espacio de recursos $(R_1, R_2)$ dibujando el paralelogramo $x_{B1}\vec{B}_1 + x_{B2}\vec{B}_2 = \vec{b}$ y la descomposición de la columna entrante $\vec{A}_j = B \cdot \vec{d}$.
- **Escena 4 (`Sensibilidad`):** SVG mostrando el cono normal en el vértice óptimo ($\nabla Z = y_1 \nabla R_1 + y_2 \nabla R_2$) y el desplazamiento animado de una restricción activa dentro de $[b_i^{\min}, b_i^{\max}]$.

---

## 3. Tokens Visuales y Animaciones CSS (Estilo FlowerPoint)

Para conservar la coherencia visual con **FlowerPoint**:
- **Bordes y trazos:** `stroke="#111111"` con grosores de `1.5px` a `2.5px`, sin sombras difuminadas; usar sombras desplazadas sólidas (`box-shadow: 4px 4px 0 #111`).
- **Paleta semántica en gráficos SVG:**
  - Región factible: `linearGradient` con `#ff9fd8` (28%), `#8fdcff` (32%), `#c7a2ff` (38%).
  - Variable entrante / rayo de avance: `#2fa36b` (verde) y `--green-soft` (`#d9f4e5`).
  - Variable saliente / vector de arista: `#2b5be8` (azul) y `--blue-soft` (`#dce5ff`).
  - Elemento pivote / base activa: `#c7a2ff` (lavanda holográfico).
  - Barrera violada / zona artificial: `#c8243f` (rojo) y `--red-soft` (`#ffe2e7`).
- **Curva de animación:** `--ease: cubic-bezier(0.16, 1, 0.3, 1)` y respeto estricto a `@media (prefers-reduced-motion: reduce)`.
