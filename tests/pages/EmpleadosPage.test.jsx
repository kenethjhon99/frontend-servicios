import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/api/empleados.api", () => ({
  getEmpleadosRequest: vi.fn(),
  createEmpleadoRequest: vi.fn(),
  updateEmpleadoRequest: vi.fn(),
  changeEstadoEmpleadoRequest: vi.fn(),
}));

import {
  changeEstadoEmpleadoRequest,
  createEmpleadoRequest,
  getEmpleadosRequest,
} from "../../src/api/empleados.api";
import EmpleadosPage from "../../src/pages/empleados/EmpleadosPage";

const renderPage = (initialEntries = ["/empleados"]) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <EmpleadosPage />
    </MemoryRouter>
  );

describe("EmpleadosPage", () => {
  beforeEach(() => {
    getEmpleadosRequest.mockReset();
    createEmpleadoRequest.mockReset();
    changeEstadoEmpleadoRequest.mockReset();
  });

  it("renderiza empleados y permite inactivar uno activo", async () => {
    getEmpleadosRequest.mockResolvedValue({
      data: [
        {
          id_empleado: 10,
          nombre_completo: "Maria Lopez",
          puesto: "Tecnico",
          especialidad: "Jardineria",
          telefono: "5555-1111",
          correo: "maria@test.com",
          estado: "ACTIVO",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });
    changeEstadoEmpleadoRequest.mockResolvedValue({
      id_empleado: 10,
      estado: "INACTIVO",
    });

    renderPage();

    expect(screen.getByRole("heading", { name: /Empleados/i })).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText("Maria Lopez")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Inactivar/i }));

    await waitFor(() =>
      expect(changeEstadoEmpleadoRequest).toHaveBeenCalledWith(10, {
        estado: "INACTIVO",
      })
    );
  });

  it("crea un empleado con horas y pago diario", async () => {
    getEmpleadosRequest.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, total_pages: 1 },
    });
    createEmpleadoRequest.mockResolvedValue({
      id_empleado: 22,
      nombre_completo: "Carlos Perez",
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Nuevo empleado/i })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Nuevo empleado/i }));
    await userEvent.type(screen.getByPlaceholderText(/Nombre completo/i), "Carlos Perez");
    await userEvent.type(screen.getByPlaceholderText(/Horas de trabajo por dia/i), "8");
    await userEvent.type(screen.getByPlaceholderText(/Pago por dia/i), "75");
    await userEvent.click(screen.getByRole("button", { name: /Guardar empleado/i }));

    await waitFor(() =>
      expect(createEmpleadoRequest).toHaveBeenCalledWith({
        id_cuadrilla: null,
        nombre_completo: "Carlos Perez",
        telefono: null,
        correo: null,
        especialidad: null,
        puesto: null,
        horas_trabajo_dia: 8,
        pago_diario: 75,
      })
    );
  });
});
