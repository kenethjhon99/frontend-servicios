import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../src/api/servicios.api", () => ({
  getCategoriasRequest: vi.fn(),
  getServiciosRequest: vi.fn(),
  createServicioRequest: vi.fn(),
  updateServicioRequest: vi.fn(),
  changeEstadoServicioRequest: vi.fn(),
}));

import {
  changeEstadoServicioRequest,
  createServicioRequest,
  getCategoriasRequest,
  getServiciosRequest,
} from "../../src/api/servicios.api";
import ServiciosPage from "../../src/pages/servicios/ServiciosPage";

describe("ServiciosPage", () => {
  beforeEach(() => {
    getCategoriasRequest.mockReset();
    getServiciosRequest.mockReset();
    createServicioRequest.mockReset();
    changeEstadoServicioRequest.mockReset();
  });

  it("renderiza servicios y permite cambiar su estado", async () => {
    getCategoriasRequest.mockResolvedValue({
      data: [{ id_categoria_servicio: 1, nombre: "Limpieza" }],
      pagination: null,
    });
    getServiciosRequest.mockResolvedValue({
      data: [
        {
          id_servicio: 7,
          id_categoria_servicio: 1,
          categoria: "Limpieza",
          nombre: "Limpieza profunda",
          descripcion: "Detalle interior",
          duracion_estimada_min: 90,
          precio_base: 125,
          estado: "ACTIVO",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });
    changeEstadoServicioRequest.mockResolvedValue({
      id_servicio: 7,
      estado: "INACTIVO",
    });

    render(<ServiciosPage />);

    await waitFor(() =>
      expect(screen.getByText("Limpieza profunda")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Inactivar|Deactivate/i }));

    await waitFor(() =>
      expect(changeEstadoServicioRequest).toHaveBeenCalledWith(7, {
        estado: "INACTIVO",
      })
    );
  });

  it("crea un servicio nuevo desde el modal", async () => {
    getCategoriasRequest.mockResolvedValue({
      data: [{ id_categoria_servicio: 1, nombre: "Limpieza" }],
      pagination: null,
    });
    getServiciosRequest.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, total_pages: 1 },
    });
    createServicioRequest.mockResolvedValue({ id_servicio: 11 });

    render(<ServiciosPage />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Nuevo servicio|New service/i })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Nuevo servicio|New service/i }));

    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects.at(-1), "1");
    await userEvent.type(
      screen.getByPlaceholderText(/Nombre del servicio|Service name/i),
      "Pulido de pisos"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Duracion estimada|Estimated duration/i),
      "60"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Precio base|Base price/i),
      "175"
    );
    await userEvent.type(
      screen.getAllByPlaceholderText(/Descripcion|Description/i).at(-1),
      "Servicio premium"
    );
    await userEvent.click(screen.getByRole("button", { name: /Guardar servicio|Save service/i }));

    await waitFor(() =>
      expect(createServicioRequest).toHaveBeenCalledWith({
        id_categoria_servicio: 1,
        nombre: "Pulido de pisos",
        descripcion: "Servicio premium",
        duracion_estimada_min: 60,
        precio_base: 175,
        requiere_materiales: false,
        permite_recurrencia: true,
      })
    );
  }, 15000);
});
