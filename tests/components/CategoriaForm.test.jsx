import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CategoriaForm from "../../src/pages/servicios/components/CategoriaForm";

describe("CategoriaForm", () => {
  it("valida que el nombre sea obligatorio", async () => {
    const onSubmit = vi.fn();

    render(<CategoriaForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.click(
      screen.getByRole("button", { name: /Guardar categoria|Save category/i })
    );

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText(/nombre de la categoria es obligatorio|Category name is required/i)
    ).toBeInTheDocument();
  });

  it("envia la categoria con descripcion opcional limpia", async () => {
    const onSubmit = vi.fn();

    render(<CategoriaForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.type(
      screen.getByPlaceholderText(/Nombre de la categoria|Category name/i),
      "  Jardineria  "
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Descripcion|Description/i),
      "  Servicios verdes  "
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Guardar categoria|Save category/i })
    );

    expect(onSubmit).toHaveBeenCalledWith({
      nombre: "Jardineria",
      descripcion: "Servicios verdes",
    });
  });
});
