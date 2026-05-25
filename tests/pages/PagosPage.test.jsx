import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/api/clientes.api", () => ({
  getClientesRequest: vi.fn(),
}));

vi.mock("../../src/api/ordenes.api", () => ({
  getOrdenesRequest: vi.fn(),
  getOrdenByIdRequest: vi.fn(),
}));

vi.mock("../../src/api/pagos.api", () => ({
  getPagosRequest: vi.fn(),
  createPagoRequest: vi.fn(),
}));

vi.mock("../../src/api/documentos.api", () => ({
  abrirReciboPagoRequest: vi.fn(),
}));

import { getClientesRequest } from "../../src/api/clientes.api";
import { abrirReciboPagoRequest } from "../../src/api/documentos.api";
import {
  getOrdenByIdRequest,
  getOrdenesRequest,
} from "../../src/api/ordenes.api";
import {
  createPagoRequest,
  getPagosRequest,
} from "../../src/api/pagos.api";
import PagosPage from "../../src/pages/pagos/PagosPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <PagosPage />
    </MemoryRouter>
  );

describe("PagosPage", () => {
  beforeEach(() => {
    getClientesRequest.mockReset();
    getOrdenesRequest.mockReset();
    getOrdenByIdRequest.mockReset();
    getPagosRequest.mockReset();
    createPagoRequest.mockReset();
    abrirReciboPagoRequest.mockReset();
  });

  it("registra un pago cargando el contexto de la orden seleccionada", async () => {
    getClientesRequest.mockResolvedValue({
      data: [{ id_cliente: 3, nombre_completo: "Client One" }],
    });
    getOrdenesRequest.mockResolvedValue({
      data: [
        {
          id_orden_trabajo: 9,
          id_cliente: 3,
          numero_orden: "ORD-0009",
          cliente: "Client One",
          total_orden: 250,
          estado: "PENDIENTE",
        },
      ],
    });
    getPagosRequest.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, total_pages: 1 },
    });
    getOrdenByIdRequest.mockResolvedValue({
      id_orden_trabajo: 9,
      numero_orden: "ORD-0009",
      total_orden: 250,
      detalles: [
        {
          id_orden_detalle: 1,
          servicio: "General cleaning",
          cantidad: 1,
          subtotal: 250,
        },
      ],
    });
    createPagoRequest.mockResolvedValue({ id_pago: 22 });

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Pagos/i })).toBeInTheDocument()
    );

    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[0], "3");
    await userEvent.selectOptions(selects[1], "9");

    await waitFor(() =>
      expect(screen.getByText(/Cobro de la orden ORD-0009/i)).toBeInTheDocument()
    );

    expect(screen.getByDisplayValue("250")).toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText(/Referencia/i),
      "DEP-101"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Notas|Observaciones/i),
      "Pago inicial"
    );
    await userEvent.click(screen.getByRole("button", { name: /Registrar pago/i }));

    await waitFor(() =>
      expect(createPagoRequest).toHaveBeenCalledWith({
        id_cliente: 3,
        id_orden_trabajo: 9,
        fecha_pago: null,
        metodo_pago: "EFECTIVO",
        monto: 250,
        referencia_pago: "DEP-101",
        observaciones: "Pago inicial",
      })
    );
  }, 15000);

  it("abre el recibo PDF de un pago listado", async () => {
    getClientesRequest.mockResolvedValue({ data: [] });
    getOrdenesRequest.mockResolvedValue({ data: [] });
    getPagosRequest.mockResolvedValue({
      data: [
        {
          id_pago: 15,
          fecha_pago: "2026-05-05",
          cliente: "Client One",
          numero_orden: "ORD-0015",
          metodo_pago: "EFECTIVO",
          monto: 120,
          referencia_pago: "REF-15",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Client One")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /PDF Recibo|PDF Receipt|PDF/i }));

    expect(abrirReciboPagoRequest).toHaveBeenCalledWith(15, undefined);
  });

  it("valida que cliente y monto sean obligatorios antes de registrar", async () => {
    getClientesRequest.mockResolvedValue({ data: [] });
    getOrdenesRequest.mockResolvedValue({ data: [] });
    getPagosRequest.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, total_pages: 1 },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Pagos/i })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Registrar pago/i }));

    expect(createPagoRequest).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Cliente y monto son obligatorios|Client and amount are required/i)
    ).toBeInTheDocument();
  });

  it("muestra error si no puede cargar el detalle de la orden seleccionada", async () => {
    getClientesRequest.mockResolvedValue({
      data: [{ id_cliente: 3, nombre_completo: "Client One" }],
    });
    getOrdenesRequest.mockResolvedValue({
      data: [
        {
          id_orden_trabajo: 9,
          id_cliente: 3,
          numero_orden: "ORD-0009",
          cliente: "Client One",
          total_orden: 250,
          estado: "PENDIENTE",
        },
      ],
    });
    getPagosRequest.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, total_pages: 1 },
    });
    getOrdenByIdRequest.mockRejectedValue({
      response: { data: { error: "Detalle no disponible" } },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Pagos/i })).toBeInTheDocument()
    );

    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[0], "3");
    await userEvent.selectOptions(selects[1], "9");

    await waitFor(() =>
      expect(screen.getByText(/Detalle no disponible/i)).toBeInTheDocument()
    );
  }, 15000);
});
