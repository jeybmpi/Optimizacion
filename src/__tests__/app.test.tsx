// @vitest-environment jsdom
// Prueba de integración: interfaz real + API Python real (requiere `python dev_server.py` en :8000).
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { checkNumber } from "../lib/validate";
import { cellText, dec } from "../lib/numfmt";

beforeAll(() => {
  const real = globalThis.fetch.bind(globalThis);
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
    real(url.startsWith("/") ? `http://127.0.0.1:8000${url}` : url, init),
  );
});
afterEach(cleanup);

async function loadExample(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
  const sel = screen.getByLabelText(/cargar un ejemplo/i);
  const opt = within(sel).getByRole("option", { name: label });
  await user.selectOptions(sel, opt);
}

describe("validación y formato", () => {
  it("valida números", () => {
    expect(checkNumber("")).toMatch(/vac/i);
    expect(checkNumber("abc")).toBeTruthy();
    expect(checkNumber("1/0")).toMatch(/cero/i);
    for (const ok of ["3", "-2.5", "3/4", "+7", "0,5"]) expect(checkNumber(ok)).toBeNull();
  });
  it("formatea celdas con M", () => {
    expect(cellText(["5", "-2"], "frac")).toBe("−2M + 5");
    expect(cellText(["-5", "1"], "frac")).toBe("M − 5");
    expect(cellText(["3/2", "0"], "dec")).toBe("1.5");
    expect(dec("17/5")).toBe("3.4");
  });
});

describe("flujo completo", () => {
  it("resuelve el ejemplo 2 paso a paso (min, =, ≥, b negativo, artificiales)", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loadExample(user, /2 · Minimizar/);
    await user.click(screen.getByRole("button", { name: /resolver paso a paso/i }));
    await waitFor(() => expect(screen.getByText(/Forma estándar aumentada/)).toBeTruthy());
    expect(screen.getByText(/lado derecho era negativo/)).toBeTruthy();
    expect(screen.getAllByText(/Entra /).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sale /).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("tab", { name: "Solución" }));
    expect(screen.getByText("Solución óptima")).toBeTruthy();
    expect(screen.getAllByText(/17\/5/).length).toBeGreaterThan(0);
  });

  it("permite elegir el simplex revisado y muestra B⁻¹ y costos reducidos", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("radio", { name: "Simplex revisado" }));
    await user.click(screen.getByRole("button", { name: /resolver paso a paso/i }));
    await waitFor(() => expect(screen.getByText(/simplex revisado \(con B⁻¹\)/)).toBeTruthy());
    expect(screen.getAllByText("B⁻¹ y variables básicas").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Costos reducidos/).length).toBeGreaterThan(0);
    // cambiar de método re-resuelve sin reiniciar
    await user.click(screen.getByRole("radio", { name: "Gran M" }));
    await waitFor(() => expect(screen.getByText(/Gran M \(tablero simplex\)/)).toBeTruthy());
  });

  it("modo directo no muestra la pestaña paso a paso", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("radio", { name: "Solución directa" }));
    await user.click(screen.getByRole("button", { name: "Resolver" }));
    await waitFor(() => expect(screen.getByText("Solución óptima")).toBeTruthy());
    expect(screen.queryByRole("tab", { name: "Paso a paso" })).toBeNull();
    expect(screen.getAllByText("36").length).toBeGreaterThan(0);
  });

  it("muestra mensaje claro en infactible y no acotado", async () => {
    const user = userEvent.setup();
    render(<App />);
    await loadExample(user, /4 · Infactible/);
    await user.click(screen.getByRole("button", { name: /resolver paso a paso/i }));
    await waitFor(() => expect(screen.getByText("Sin solución factible")).toBeTruthy());
    expect(screen.getByText(/no tiene solución factible/)).toBeTruthy();
    await loadExample(user, /5 · No acotado/);
    await user.click(screen.getByRole("button", { name: /resolver paso a paso/i }));
    await waitFor(() => expect(screen.getByText("Solución no acotada")).toBeTruthy());
  });

  it("valida la entrada y no llama al servidor", async () => {
    const user = userEvent.setup();
    render(<App />);
    const field = screen.getByLabelText("Restricción 1, coeficiente de x1");
    await user.clear(field);
    await user.type(field, "abc");
    await user.click(screen.getByRole("button", { name: /resolver paso a paso/i }));
    expect(await screen.findByText(/Corrige estos datos/)).toBeTruthy();
    expect(screen.queryByText("Solución óptima")).toBeNull();
  });

  it("agrega y quita variables y restricciones", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "+ Variable" }));
    expect(screen.getByLabelText("Coeficiente de x3 en Z")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "+ Restricción" }));
    expect(screen.getByLabelText("Tipo de la restricción 4")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Quitar variable x3" }));
    expect(screen.queryByLabelText("Coeficiente de x3 en Z")).toBeNull();
  });

  it("muestra el método gráfico 2D y el análisis de sensibilidad", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /resolver paso a paso/i }));
    await waitFor(() => expect(screen.getByText("Solución óptima")).toBeTruthy());

    await user.click(screen.getByRole("tab", { name: "Método gráfico" }));
    expect(screen.getByText(/Región factible y curva de isoutilidad/i)).toBeTruthy();
    expect(screen.getByLabelText("Gráfico de la región factible y vértices")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "Sensibilidad" }));
    expect(screen.getByText(/Precios sombra e intervalos de factibilidad/i)).toBeTruthy();
    expect(screen.getByText(/Costos reducidos e intervalos de optimalidad/i)).toBeTruthy();
  });
});
