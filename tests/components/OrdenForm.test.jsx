import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../src/api/clientes.api", () => ({
  getClientesRequest: vi.fn(),
  getPropiedadesByClienteRequest: vi.fn(),
}));

vi.mock("../../src/api/empleados.api", () => ({
  getEmpleadosRequest: vi.fn(),
}));

vi.mock("../../src/api/servicios.api", () => ({
  getServiciosRequest: vi.fn(),
}));

import {
  getClientesRequest,
  getPropiedadesByClienteRequest,
} from "../../src/api/clientes.api";
import { getEmpleadosRequest } from "../../src/api/empleados.api";
import { getServiciosRequest } from "../../src/api/servicios.api";
import OrdenForm from "../../src/pages/ordenes/components/OrdenForm";

describe("OrdenForm", () => {
  beforeEach(() => {
    getClientesRequest.mockReset();
    getPropiedadesByClienteRequest.mockReset();
    getEmpleadosRequest.mockReset();
    getServiciosRequest.mockReset();
  });

  it("envia empleados asignados aunque no use cuadrillas", async () => {
    getClientesRequest.mockResolvedValue({
      data: [{ id_cliente: 1, nombre_completo: "Cliente Uno" }],
      pagination: null,
    });
    getEmpleadosRequest.mockResolvedValue({
      data: [{ id_empleado: 20, nombre_completo: "Maria Lopez" }],
      pagination: null,
    });
    getServiciosRequest.mockResolvedValue({
      data: [{ id_servicio: 9, nombre: "Poda" }],
      pagination: null,
    });
    getPropiedadesByClienteRequest.mockResolvedValue([
      {
        id_propiedad: 3,
        nombre_propiedad: "Casa A",
        estado: "ACTIVA",
      },
    ]);

    const onSubmit = vi.fn();
    const { container } = render(<OrdenForm onSubmit={onSubmit} onCancel={() => {}} />);

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Cliente Uno" })).toBeInTheDocument()
    );

    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[0], "1");
    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Casa A" })).toBeInTheDocument()
    );
    await userEvent.selectOptions(selects[1], "3");
    await userEvent.click(screen.getByRole("button", { name: /Siguiente/i }));

    await userEvent.selectOptions(
      screen.getByRole("listbox", { name: /Empleados asignados/i }),
      "20"
    );

    fireEvent.change(container.querySelector('input[name="fecha_servicio"]'), {
      target: { value: "2026-05-12" },
    });
    await userEvent.click(screen.getByRole("button", { name: /Siguiente/i }));

    await userEvent.selectOptions(screen.getByRole("combobox"), "9");
    await userEvent.clear(screen.getByPlaceholderText(/Precio unitario/i));
    await userEvent.type(screen.getByPlaceholderText(/Precio unitario/i), "150");
    await userEvent.click(screen.getByRole("button", { name: /Siguiente/i }));

    await userEvent.click(screen.getByRole("button", { name: /Crear orden/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        id_cliente: 1,
        id_propiedad: 3,
        id_empleados: [20],
        fecha_servicio: "2026-05-12",
      })
    );
  }, 15000);
});
