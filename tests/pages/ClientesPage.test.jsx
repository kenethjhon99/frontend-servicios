import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/api/clientes.api", () => ({
  getClientesRequest: vi.fn(),
  createClienteRequest: vi.fn(),
  updateClienteRequest: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../src/context/toast.context", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

import {
  createClienteRequest,
  getClientesRequest,
} from "../../src/api/clientes.api";
import ClientesPage from "../../src/pages/clientes/ClientesPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <ClientesPage />
    </MemoryRouter>
  );

describe("ClientesPage", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
    getClientesRequest.mockReset();
    createClienteRequest.mockReset();
  });

  it("renderiza clientes y navega al detalle", async () => {
    getClientesRequest.mockResolvedValue({
      data: [
        {
          id_cliente: 7,
          codigo_cliente: "CL-000007",
          nombre_completo: "John Carter",
          nombre_empresa: "Nova Services LLC",
          telefono: "555-0101",
          tipo_cliente: "HABITUAL",
          estado: "ACTIVO",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("John Carter")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Detalle/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/clientes/7");
  });

  it("crea un cliente nuevo desde el asistente multipaso", async () => {
    getClientesRequest.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, total_pages: 1 },
    });
    createClienteRequest.mockResolvedValue({ id_cliente: 11 });

    renderPage();

    await userEvent.click(screen.getByRole("button", { name: /Nuevo cliente/i }));

    await userEvent.type(
      screen.getByPlaceholderText(/Nombre completo/i),
      "Alice Walker"
    );
    await userEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    await userEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Guardar$/i }));

    await waitFor(() =>
      expect(createClienteRequest).toHaveBeenCalledWith({
        codigo_cliente: "",
        nombre_completo: "Alice Walker",
        nombre_empresa: "",
        telefono: "",
        telefono_secundario: "",
        correo: "",
        nit: "",
        id_documento: "",
        direccion_principal: "",
        tipo_cliente: "HABITUAL",
        observaciones: "",
        idioma_preferido: "en",
      })
    );
  }, 15000);
});
