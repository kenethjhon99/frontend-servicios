import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ClienteForm from "../../src/pages/clientes/components/ClienteForm";

describe("ClienteForm", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("valida empresa cuando el tipo de facturacion es empresa", async () => {
    const onSubmit = vi.fn();

    render(<ClienteForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: /^Empresa$|^Company$/i }));
    await userEvent.type(
      screen.getByPlaceholderText(/Contacto principal|Primary contact/i),
      "Ana Gomez"
    );
    await userEvent.click(screen.getByRole("button", { name: /Siguiente|Next/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText(/empresa es obligatorio|Company name is required/i)
    ).toBeInTheDocument();
  });

  it("envia un cliente empresa con idioma espanol", async () => {
    const onSubmit = vi.fn();

    render(<ClienteForm onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: /^Empresa$|^Company$/i }));
    await userEvent.type(
      screen.getByPlaceholderText(/Contacto principal|Primary contact/i),
      "Ana Gomez"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Nombre de la empresa|Company name/i),
      "North Services LLC"
    );
    await userEvent.click(screen.getByRole("button", { name: /Siguiente|Next/i }));

    await userEvent.type(
      screen.getByPlaceholderText(/^Telefono$|^Phone$/i),
      "555-0101"
    );
    await userEvent.click(screen.getByRole("button", { name: /Siguiente|Next/i }));

    await userEvent.click(screen.getByRole("button", { name: /Espanol principal|Spanish primary/i }));
    await userEvent.type(
      screen.getByPlaceholderText(/Direccion principal|Primary address/i),
      "742 Evergreen"
    );
    await userEvent.click(screen.getByRole("button", { name: /^Guardar$|^Save$/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        codigo_cliente: "",
        nombre_completo: "Ana Gomez",
        nombre_empresa: "North Services LLC",
        telefono: "555-0101",
        telefono_secundario: "",
        correo: "",
        nit: "",
        id_documento: "",
        direccion_principal: "742 Evergreen",
        tipo_cliente: "HABITUAL",
        observaciones: "",
        idioma_preferido: "es",
      })
    );
  }, 15000);
});
