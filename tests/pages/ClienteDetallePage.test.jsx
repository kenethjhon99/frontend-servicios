import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../../src/api/clientes.api", () => ({
  getClienteResumenRequest: vi.fn(),
  createPropiedadRequest: vi.fn(),
}));

vi.mock("../../src/api/documentos.api", () => ({
  abrirEstadoCuentaRequest: vi.fn(),
}));

import { getClienteResumenRequest } from "../../src/api/clientes.api";
import { abrirEstadoCuentaRequest } from "../../src/api/documentos.api";
import ClienteDetallePage from "../../src/pages/clientes/ClienteDetallePage";

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/clientes/7"]}>
      <Routes>
        <Route path="/clientes/:id" element={<ClienteDetallePage />} />
      </Routes>
    </MemoryRouter>
  );

describe("ClienteDetallePage", () => {
  beforeEach(() => {
    getClienteResumenRequest.mockReset();
    abrirEstadoCuentaRequest.mockReset();
  });

  it("abre el estado de cuenta en idioma cliente, espanol e ingles", async () => {
    getClienteResumenRequest.mockResolvedValue({
      cliente: {
        id_cliente: 7,
        nombre_completo: "John Carter",
        nombre_empresa: "Nova Services",
        telefono: "555-0101",
        correo: "john@example.com",
        nit: "TAX-1",
        id_documento: "ID-9",
        estado: "ACTIVO",
        tipo_cliente: "HABITUAL",
        idioma_preferido: "en",
      },
      propiedades: [],
      programaciones: [],
      ordenes: [],
      pagos: [],
      creditos: [],
      cobranza_seguimientos: [
        {
          id_seguimiento: 1,
          fecha_seguimiento: "2026-05-02",
          medio_contacto: "LLAMADA",
          resultado: "PROMESA_PAGO",
          proximo_contacto: "2026-05-10",
          numero_orden: "ORD-0007",
          notas: "Promete pago el viernes",
        },
      ],
      resumen: {
        total_pagado: 0,
        saldo_pendiente: 0,
        creditos_activos: 0,
        total_ordenes: 0,
        programaciones_activas: 0,
      },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "John Carter" })).toBeInTheDocument()
    );

    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    await userEvent.clear(dateInputs[0]);
    await userEvent.type(dateInputs[0], "2026-05-01");
    await userEvent.clear(dateInputs[1]);
    await userEvent.type(dateInputs[1], "2026-05-31");

    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons.find((button) => button.textContent.trim() === "PDF"));
    expect(abrirEstadoCuentaRequest).toHaveBeenLastCalledWith("7", {
      lang: undefined,
      desde: "2026-05-01",
      hasta: "2026-05-31",
    });

    await userEvent.click(screen.getByRole("button", { name: "ES" }));
    expect(abrirEstadoCuentaRequest).toHaveBeenLastCalledWith("7", {
      lang: "es",
      desde: "2026-05-01",
      hasta: "2026-05-31",
    });

    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(abrirEstadoCuentaRequest).toHaveBeenLastCalledWith("7", {
      lang: "en",
      desde: "2026-05-01",
      hasta: "2026-05-31",
    });

    expect(
      screen.getByRole("heading", {
        name: /Collections follow-up|Seguimiento de cobranza/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/Promete pago el viernes/i)).toBeInTheDocument();
  }, 15000);
});
