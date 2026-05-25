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
import ProgramacionForm from "../../src/pages/programaciones/components/ProgramacionForm";

describe("ProgramacionForm", () => {
  beforeEach(() => {
    getClientesRequest.mockReset();
    getPropiedadesByClienteRequest.mockReset();
    getEmpleadosRequest.mockReset();
    getServiciosRequest.mockReset();
  });

  it("envia responsable numerico cuando se selecciona un empleado", async () => {
    getClientesRequest.mockResolvedValue({
      data: [{ id_cliente: 1, nombre_completo: "Cliente Uno" }],
      pagination: null,
    });
    getEmpleadosRequest.mockResolvedValue({
      data: [{ id_empleado: 20, nombre_completo: "Maria Lopez" }],
      pagination: null,
    });
    getServiciosRequest.mockResolvedValue({
      data: [{ id_servicio: 8, nombre: "Fumigacion" }],
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
    const { container } = render(
      <ProgramacionForm onSubmit={onSubmit} onCancel={() => {}} />
    );

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

    await waitFor(() =>
      expect(screen.getByRole("option", { name: "Fumigacion" })).toBeInTheDocument()
    );
    await userEvent.selectOptions(screen.getAllByRole("combobox")[0], "8");
    await userEvent.click(screen.getByRole("button", { name: /Siguiente/i }));

    fireEvent.change(container.querySelector('input[name="fecha_inicio"]'), {
      target: { value: "2026-05-01" },
    });
    fireEvent.change(container.querySelector('input[name="proxima_fecha"]'), {
      target: { value: "2026-05-08" },
    });
    await userEvent.type(
      screen.getByPlaceholderText(/Duracion estimada en minutos/i),
      "60"
    );
    await userEvent.click(screen.getByRole("button", { name: /Siguiente/i }));

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /Empleado responsable/i }),
      "20"
    );
    await userEvent.type(screen.getByPlaceholderText(/Precio acordado/i), "250");

    await userEvent.click(screen.getByRole("button", { name: /Guardar programacion/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        id_cliente: 1,
        id_propiedad: 3,
        id_servicio: 8,
        id_empleado_responsable: 20,
      })
    );
  }, 15000);
});
