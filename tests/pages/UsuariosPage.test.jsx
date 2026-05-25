import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../../src/context/auth.context";

vi.mock("../../src/api/usuarios.api", () => ({
  getUsuariosRequest: vi.fn(),
  createUsuarioRequest: vi.fn(),
  updateUsuarioRequest: vi.fn(),
  changeEstadoUsuarioRequest: vi.fn(),
  resetPasswordUsuarioRequest: vi.fn(),
}));

vi.mock("../../src/context/toast.context", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

import {
  createUsuarioRequest,
  getUsuariosRequest,
  resetPasswordUsuarioRequest,
} from "../../src/api/usuarios.api";
import UsuariosPage from "../../src/pages/usuarios/UsuariosPage";

const renderPage = () =>
  render(
    <AuthContext.Provider value={{ user: { id_usuario: 1, username: "admin" } }}>
      <MemoryRouter>
        <UsuariosPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe("UsuariosPage", () => {
  beforeEach(() => {
    getUsuariosRequest.mockReset();
    createUsuarioRequest.mockReset();
    resetPasswordUsuarioRequest.mockReset();
  });

  it("crea un usuario nuevo desde la pagina de administracion", async () => {
    getUsuariosRequest.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, total_pages: 1 },
    });
    createUsuarioRequest.mockResolvedValue({ id_usuario: 3 });

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /Nuevo usuario|New user/i }));
    const saveButton = screen.getByRole("button", { name: /Guardar usuario|Save user/i });
    const form = saveButton.closest("form");

    fireEvent.change(within(form).getByPlaceholderText(/^Nombre completo|^Full name/i), {
      target: { value: "Operator One" },
    });
    fireEvent.change(within(form).getByPlaceholderText(/Username/i), {
      target: { value: "operator1" },
    });
    fireEvent.change(within(form).getByPlaceholderText(/Correo|Email/i), {
      target: { value: "operator@test.com" },
    });
    fireEvent.change(within(form).getByPlaceholderText(/Telefono|Phone/i), {
      target: { value: "555-0202" },
    });
    fireEvent.change(
      within(form).getByPlaceholderText(/Contraseña temporal|Temporary password/i),
      {
        target: { value: "Admin1234" },
      }
    );
    fireEvent.change(
      within(form).getByPlaceholderText(/Confirmar contraseña|Confirm password/i),
      {
        target: { value: "Admin1234" },
      }
    );
    await userEvent.click(saveButton);

    await waitFor(() =>
      expect(createUsuarioRequest).toHaveBeenCalledWith({
        nombre: "Operator One",
        correo: "operator@test.com",
        telefono: "555-0202",
        username: "operator1",
        rol: "OPERADOR",
        password: "Admin1234",
      })
    );
  });

  it("resetea la contrasena de un usuario existente", async () => {
    getUsuariosRequest.mockResolvedValue({
      data: [
        {
          id_usuario: 5,
          nombre: "Collector",
          correo: "collector@test.com",
          telefono: null,
          username: "collector",
          rol: "COBRADOR",
          estado: "ACTIVO",
          updated_at: "2026-05-07T12:00:00.000Z",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });
    resetPasswordUsuarioRequest.mockResolvedValue({
      mensaje: "Password updated",
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Collector")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Reset/i }));
    const passwordField = screen.getByPlaceholderText(/Nueva contraseña|New password/i);
    const form = passwordField.closest("form");
    const resetButton = within(form).getByRole("button", {
      name: /users\.resetSubmit|Reset/i,
    });

    fireEvent.change(passwordField, {
      target: { value: "NewPass123" },
    });
    fireEvent.change(
      within(form).getByPlaceholderText(/Confirmar contraseña|Confirm password/i),
      {
        target: { value: "NewPass123" },
      }
    );
    await userEvent.click(resetButton);

    await waitFor(() =>
      expect(resetPasswordUsuarioRequest).toHaveBeenCalledWith(5, {
        password_nueva: "NewPass123",
        confirmar_password: "NewPass123",
      })
    );
  });
});
