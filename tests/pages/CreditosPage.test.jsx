import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/api/pagos.api", () => ({
  getCreditosRequest: vi.fn(),
  aplicarPagoCreditoRequest: vi.fn(),
  changeEstadoCreditoRequest: vi.fn(),
}));

vi.mock("../../src/api/documentos.api", () => ({
  abrirReciboAbonoRequest: vi.fn(),
}));

import { abrirReciboAbonoRequest } from "../../src/api/documentos.api";
import {
  aplicarPagoCreditoRequest,
  changeEstadoCreditoRequest,
  getCreditosRequest,
} from "../../src/api/pagos.api";
import CreditosPage from "../../src/pages/pagos/CreditosPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <CreditosPage />
    </MemoryRouter>
  );

describe("CreditosPage", () => {
  beforeEach(() => {
    getCreditosRequest.mockReset();
    aplicarPagoCreditoRequest.mockReset();
    changeEstadoCreditoRequest.mockReset();
    abrirReciboAbonoRequest.mockReset();
  });

  it("aplica un abono y permite abrir el recibo generado", async () => {
    getCreditosRequest.mockResolvedValue({
      data: [
        {
          id_credito: 5,
          cliente: "Client One",
          numero_orden: "ORD-020",
          monto_total: 300,
          monto_pagado: 100,
          saldo_pendiente: 200,
          fecha_vencimiento: "2026-05-30",
          estado: "PENDIENTE",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });
    aplicarPagoCreditoRequest.mockResolvedValue({
      id_pago_credito: 44,
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Client One")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Abonar|Partial payment/i }));
    await userEvent.type(screen.getByPlaceholderText(/Monto|Amount/i), "75");
    await userEvent.type(screen.getByPlaceholderText(/Referencia/i), "AB-44");
    await userEvent.click(screen.getByRole("button", { name: /Aplicar abono|Apply payment/i }));

    await waitFor(() =>
      expect(aplicarPagoCreditoRequest).toHaveBeenCalledWith({
        id_credito: 5,
        metodo_pago: "EFECTIVO",
        monto: 75,
        referencia_pago: "AB-44",
        observaciones: null,
      })
    );

    await waitFor(() =>
      expect(screen.getByText(/Abono aplicado\. Descarga el recibo/i)).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /PDF Recibo|PDF Receipt|PDF/i }));
    expect(abrirReciboAbonoRequest).toHaveBeenCalledWith(44, undefined);
  }, 15000);

  it("bloquea abonos mayores al saldo pendiente", async () => {
    getCreditosRequest.mockResolvedValue({
      data: [
        {
          id_credito: 8,
          cliente: "Client Two",
          numero_orden: "ORD-030",
          monto_total: 400,
          monto_pagado: 300,
          saldo_pendiente: 100,
          fecha_vencimiento: "2026-05-30",
          estado: "PARCIAL",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Client Two")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Abonar|Partial payment/i }));
    await userEvent.type(screen.getByPlaceholderText(/Monto|Amount/i), "150");
    await userEvent.click(screen.getByRole("button", { name: /Aplicar abono|Apply payment/i }));

    expect(aplicarPagoCreditoRequest).not.toHaveBeenCalled();
    expect(
      screen.getAllByText(
        /no puede ser mayor al saldo pendiente|cannot be greater than the outstanding balance/i
      ).length
    ).toBeGreaterThan(0);
  }, 15000);

  it("permite cancelar un credito desde la confirmacion", async () => {
    getCreditosRequest.mockResolvedValue({
      data: [
        {
          id_credito: 11,
          cliente: "Client Three",
          numero_orden: "ORD-040",
          monto_total: 500,
          monto_pagado: 0,
          saldo_pendiente: 500,
          fecha_vencimiento: "2026-06-15",
          estado: "PENDIENTE",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });
    changeEstadoCreditoRequest.mockResolvedValue({
      id_credito: 11,
      estado: "CANCELADO",
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Client Three")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Cancelar credito|Cancel credit/i }));
    await userEvent.click(
      screen.getAllByRole("button", { name: /Cancelar credito|Cancel credit/i }).at(-1)
    );

    await waitFor(() =>
      expect(changeEstadoCreditoRequest).toHaveBeenCalledWith(11, {
        estado: "CANCELADO",
      })
    );
  }, 15000);
});
