import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// Mock del módulo de api antes de importar nada que lo use.
vi.mock("../../src/api/auth.api", () => ({
  loginRequest: vi.fn(),
  perfilRequest: vi.fn(() => Promise.reject(new Error("no token"))),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { loginRequest } from "../../src/api/auth.api";
import { AuthProvider } from "../../src/context/AuthContext";
import LoginPage from "../../src/pages/auth/LoginPage";

const renderLogin = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );

describe("LoginPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    loginRequest.mockReset();
    localStorage.clear();
  });

  it("renderiza los campos esperados y el título", () => {
    renderLogin();
    expect(screen.getByText(/Iniciar sesión/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Usuario/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ingresar/i })).toBeInTheDocument();
  });

  it("permite escribir usuario y contraseña", async () => {
    renderLogin();
    const userInput = screen.getByPlaceholderText(/Usuario/i);
    const passInput = screen.getByPlaceholderText(/Contraseña/i);

    await userEvent.type(userInput, "admin");
    await userEvent.type(passInput, "secreto123");

    expect(userInput).toHaveValue("admin");
    expect(passInput).toHaveValue("secreto123");
  });

  it("login exitoso → guarda token, setea user y navega a '/'", async () => {
    loginRequest.mockResolvedValueOnce({
      token: "tok-abc",
      usuario: { id_usuario: 1, username: "admin", rol: "ADMIN" },
    });

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText(/Usuario/i), "admin");
    await userEvent.type(screen.getByPlaceholderText(/Contraseña/i), "Password123");
    await userEvent.click(screen.getByRole("button", { name: /Ingresar/i }));

    await waitFor(() =>
      expect(loginRequest).toHaveBeenCalledWith({
        username: "admin",
        password: "Password123",
      })
    );
    expect(localStorage.getItem("token")).toBe("tok-abc");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("muestra el error del backend cuando login falla con response.data.error", async () => {
    loginRequest.mockRejectedValueOnce({
      response: { data: { error: "Credenciales inválidas" } },
    });

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText(/Usuario/i), "admin");
    await userEvent.type(screen.getByPlaceholderText(/Contraseña/i), "mala");
    await userEvent.click(screen.getByRole("button", { name: /Ingresar/i }));

    await waitFor(() =>
      expect(screen.getByText(/Credenciales inválidas/i)).toBeInTheDocument()
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("muestra mensaje genérico cuando el error no tiene response.data.error", async () => {
    loginRequest.mockRejectedValueOnce(new Error("network down"));

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText(/Usuario/i), "admin");
    await userEvent.type(screen.getByPlaceholderText(/Contraseña/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /Ingresar/i }));

    await waitFor(() =>
      expect(screen.getByText(/Error al iniciar sesión/i)).toBeInTheDocument()
    );
  });

  it("deshabilita el botón mientras envía el formulario", async () => {
    let resolveLogin;
    loginRequest.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLogin = resolve;
      })
    );

    renderLogin();

    await userEvent.type(screen.getByPlaceholderText(/Usuario/i), "admin");
    await userEvent.type(screen.getByPlaceholderText(/Contraseña/i), "Pass1234");
    await userEvent.click(screen.getByRole("button", { name: /Ingresar/i }));

    const btn = screen.getByRole("button", { name: /Ingresando/i });
    expect(btn).toBeDisabled();

    // Liberar la promesa
    resolveLogin({
      token: "x",
      usuario: { id_usuario: 1, username: "admin", rol: "ADMIN" },
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });
});
