import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../src/api/servicios.api", () => ({
  getCategoriasRequest: vi.fn(),
  createCategoriaRequest: vi.fn(),
  updateCategoriaRequest: vi.fn(),
  changeEstadoCategoriaRequest: vi.fn(),
}));

import {
  changeEstadoCategoriaRequest,
  createCategoriaRequest,
  getCategoriasRequest,
} from "../../src/api/servicios.api";
import CategoriasPage from "../../src/pages/servicios/CategoriasPage";

describe("CategoriasPage", () => {
  beforeEach(() => {
    getCategoriasRequest.mockReset();
    createCategoriaRequest.mockReset();
    changeEstadoCategoriaRequest.mockReset();
  });

  it("renderiza categorias y permite inactivar una categoria activa", async () => {
    getCategoriasRequest.mockResolvedValue({
      data: [
        {
          id_categoria_servicio: 2,
          nombre: "Limpieza",
          descripcion: "Servicios de limpieza",
          estado: "ACTIVA",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });
    changeEstadoCategoriaRequest.mockResolvedValue({
      id_categoria_servicio: 2,
      estado: "INACTIVA",
    });

    render(<CategoriasPage />);

    await waitFor(() =>
      expect(screen.getByText("Limpieza")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Inactivar|Deactivate/i }));

    await waitFor(() =>
      expect(changeEstadoCategoriaRequest).toHaveBeenCalledWith(2, {
        estado: "INACTIVA",
      })
    );
  });

  it("crea una categoria nueva desde el modal", async () => {
    getCategoriasRequest.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, total_pages: 1 },
    });
    createCategoriaRequest.mockResolvedValue({ id_categoria_servicio: 9 });

    render(<CategoriasPage />);

    await userEvent.click(screen.getByRole("button", { name: /Nueva categoria|New category/i }));
    await userEvent.type(
      screen.getByPlaceholderText(/Nombre de la categoria|Category name/i),
      "Mantenimiento"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Descripcion|Description/i),
      "Servicios recurrentes"
    );
    await userEvent.click(screen.getByRole("button", { name: /Guardar categoria|Save category/i }));

    await waitFor(() =>
      expect(createCategoriaRequest).toHaveBeenCalledWith({
        nombre: "Mantenimiento",
        descripcion: "Servicios recurrentes",
      })
    );
  }, 15000);
});
