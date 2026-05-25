import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/api/clientes.api", () => ({
  getClientesRequest: vi.fn(),
  createPropiedadRequest: vi.fn(),
  updatePropiedadRequest: vi.fn(),
  changeEstadoPropiedadRequest: vi.fn(),
}));

vi.mock("../../src/api/propiedades.api", () => ({
  getPropiedadesRequest: vi.fn(),
  createPropiedadRequest: vi.fn(),
  updatePropiedadRequest: vi.fn(),
  changeEstadoPropiedadRequest: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { getClientesRequest } from "../../src/api/clientes.api";
import {
  changeEstadoPropiedadRequest,
  getPropiedadesRequest,
} from "../../src/api/propiedades.api";
import PropiedadesPage from "../../src/pages/propiedades/PropiedadesPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <PropiedadesPage />
    </MemoryRouter>
  );

describe("PropiedadesPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    getClientesRequest.mockReset();
    getPropiedadesRequest.mockReset();
    changeEstadoPropiedadRequest.mockReset();
  });

  it("muestra propiedades, navega al cliente y permite inactivar", async () => {
    getClientesRequest.mockResolvedValue({ data: [] });
    getPropiedadesRequest.mockResolvedValue({
      data: [
        {
          id_propiedad: 4,
          id_cliente: 9,
          nombre_propiedad: "Main Office",
          referencia: "Zone A",
          tipo_propiedad: "OFICINA",
          nombre_completo: "Client One",
          nombre_empresa: "Nova LLC",
          direccion: "123 Main St",
          estado: "ACTIVA",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });
    changeEstadoPropiedadRequest.mockResolvedValue({
      id_propiedad: 4,
      estado: "INACTIVA",
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Main Office")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Ir al cliente/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/clientes/9");

    await userEvent.click(screen.getByRole("button", { name: /Inactivar/i }));
    await waitFor(() =>
      expect(changeEstadoPropiedadRequest).toHaveBeenCalledWith(4, {
        estado: "INACTIVA",
      })
    );
  });
});
