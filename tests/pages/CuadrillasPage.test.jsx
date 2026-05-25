import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../src/api/cuadrillas.api", () => ({
  getCuadrillasRequest: vi.fn(),
  createCuadrillaRequest: vi.fn(),
  updateCuadrillaRequest: vi.fn(),
  changeEstadoCuadrillaRequest: vi.fn(),
}));

import {
  changeEstadoCuadrillaRequest,
  getCuadrillasRequest,
} from "../../src/api/cuadrillas.api";
import CuadrillasPage from "../../src/pages/cuadrillas/CuadrillasPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <CuadrillasPage />
    </MemoryRouter>
  );

describe("CuadrillasPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    getCuadrillasRequest.mockReset();
    changeEstadoCuadrillaRequest.mockReset();
  });

  it("renderiza cuadrillas y permite inactivar una activa", async () => {
    getCuadrillasRequest.mockResolvedValue({
      data: [
        {
          id_cuadrilla: 2,
          nombre: "Equipo Norte",
          descripcion: "Cobertura zona norte",
          estado: "ACTIVA",
          total_empleados: 5,
          empleados_activos: 4,
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });
    changeEstadoCuadrillaRequest.mockResolvedValue({
      id_cuadrilla: 2,
      estado: "INACTIVA",
    });

    renderPage();

    expect(screen.getByRole("heading", { name: /Cuadrillas/i })).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText("Equipo Norte")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Inactivar/i }));

    await waitFor(() =>
      expect(changeEstadoCuadrillaRequest).toHaveBeenCalledWith(2, {
        estado: "INACTIVA",
      })
    );
  });

  it("permite navegar al equipo filtrado de una cuadrilla", async () => {
    getCuadrillasRequest.mockResolvedValue({
      data: [
        {
          id_cuadrilla: 2,
          nombre: "Equipo Norte",
          descripcion: "Cobertura zona norte",
          estado: "ACTIVA",
          total_empleados: 5,
          empleados_activos: 4,
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Equipo Norte")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Ver equipo/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/empleados?id_cuadrilla=2");
  });
});
