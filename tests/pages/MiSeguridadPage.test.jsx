import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../src/api/usuarios.api", () => ({
  changeMyPasswordRequest: vi.fn(),
}));

vi.mock("../../src/context/toast.context", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

import { changeMyPasswordRequest } from "../../src/api/usuarios.api";
import MiSeguridadPage from "../../src/pages/seguridad/MiSeguridadPage";

describe("MiSeguridadPage", () => {
  beforeEach(() => {
    changeMyPasswordRequest.mockReset();
  });

  it("valida que la confirmacion coincida", async () => {
    render(<MiSeguridadPage />);

    await userEvent.type(
      screen.getByPlaceholderText(/Contraseña actual|Current password/i),
      "Admin1234"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Escribe la nueva contraseña|Type the new password/i),
      "NewPass123"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Repite la nueva contraseña|Repeat the new password/i),
      "OtherPass123"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Actualizar contraseña|Save password/i })
    );

    expect(changeMyPasswordRequest).not.toHaveBeenCalled();
    expect(screen.getByText(/do not match|no coincide/i)).toBeInTheDocument();
  }, 15000);

  it("envia el cambio de contrasena propia", async () => {
    changeMyPasswordRequest.mockResolvedValue({ mensaje: "Password updated" });

    render(<MiSeguridadPage />);

    await userEvent.type(
      screen.getByPlaceholderText(/Contraseña actual|Current password/i),
      "Admin1234"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Escribe la nueva contraseña|Type the new password/i),
      "NewPass123"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Repite la nueva contraseña|Repeat the new password/i),
      "NewPass123"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Actualizar contraseña|Save password/i })
    );

    await waitFor(() =>
      expect(changeMyPasswordRequest).toHaveBeenCalledWith({
        password_actual: "Admin1234",
        password_nueva: "NewPass123",
        confirmar_password: "NewPass123",
      })
    );
  }, 15000);
});
