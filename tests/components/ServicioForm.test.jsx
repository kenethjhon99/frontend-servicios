import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ServicioForm from "../../src/pages/servicios/components/ServicioForm";

const categorias = [{ id_categoria_servicio: 3, nombre: "Jardineria" }];

describe("ServicioForm", () => {
  it("valida que se seleccione una categoria", async () => {
    const onSubmit = vi.fn();

    render(
      <ServicioForm categorias={categorias} onSubmit={onSubmit} onCancel={() => {}} />
    );

    await userEvent.type(
      screen.getByPlaceholderText(/Nombre del servicio|Service name/i),
      "Poda especial"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Duracion estimada|Estimated duration/i),
      "45"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Guardar servicio|Save service/i })
    );

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText(/categoria es obligatoria|category is required/i)
    ).toBeInTheDocument();
  });

  it("envia el servicio con toggles y valores normalizados", async () => {
    const onSubmit = vi.fn();

    render(
      <ServicioForm categorias={categorias} onSubmit={onSubmit} onCancel={() => {}} />
    );

    await userEvent.selectOptions(screen.getByRole("combobox"), "3");
    await userEvent.type(
      screen.getByPlaceholderText(/Nombre del servicio|Service name/i),
      "Poda especial"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Duracion estimada|Estimated duration/i),
      "45"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Precio base|Base price/i),
      "80"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Descripcion|Description/i),
      "Recorte de jardin"
    );
    await userEvent.click(screen.getByRole("checkbox", { name: /Requiere materiales|Requires materials/i }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Permite recurrencia|Allows recurrence/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /Guardar servicio|Save service/i })
    );

    expect(onSubmit).toHaveBeenCalledWith({
      id_categoria_servicio: 3,
      nombre: "Poda especial",
      descripcion: "Recorte de jardin",
      duracion_estimada_min: 45,
      precio_base: 80,
      requiere_materiales: true,
      permite_recurrencia: false,
    });
  }, 15000);
});
