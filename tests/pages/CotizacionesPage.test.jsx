import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/api/cotizaciones.api", () => ({
  getCotizacionesRequest: vi.fn(),
  createCotizacionRequest: vi.fn(),
  updateCotizacionRequest: vi.fn(),
  changeEstadoCotizacionRequest: vi.fn(),
}));

vi.mock("../../src/api/clientes.api", () => ({
  getClientesRequest: vi.fn(),
  getPropiedadesByClienteRequest: vi.fn(() => Promise.resolve([])),
}));

vi.mock("../../src/api/servicios.api", () => ({
  getServiciosRequest: vi.fn(() => Promise.resolve([])),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../src/context/toast.context", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

import {
  changeEstadoCotizacionRequest,
  getCotizacionesRequest,
} from "../../src/api/cotizaciones.api";
import { getClientesRequest } from "../../src/api/clientes.api";
import CotizacionesPage from "../../src/pages/cotizaciones/CotizacionesPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <CotizacionesPage />
    </MemoryRouter>
  );

describe("CotizacionesPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    getCotizacionesRequest.mockReset();
    getClientesRequest.mockReset();
    changeEstadoCotizacionRequest.mockReset();
  });

  it("renderiza cotizaciones y permite enviar una en borrador", async () => {
    getClientesRequest.mockResolvedValue([]);
    getCotizacionesRequest.mockResolvedValue({
      data: [
        {
          id_cotizacion: 1,
          numero_cotizacion: "COT-20260428-00001",
          fecha_cotizacion: "2026-04-28",
          cliente: "Cliente Uno",
          nombre_propiedad: "Casa 1",
          vigencia_hasta: "2026-05-05",
          total: 180,
          estado: "BORRADOR",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });
    changeEstadoCotizacionRequest.mockResolvedValue({
      id_cotizacion: 1,
      estado: "ENVIADA",
    });

    renderPage();

    expect(
      screen.getByRole("heading", { name: /Cotizaciones/i })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("COT-20260428-00001")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Enviar/i }));

    await waitFor(() =>
      expect(changeEstadoCotizacionRequest).toHaveBeenCalledWith(1, {
        estado: "ENVIADA",
      })
    );
  });
});
