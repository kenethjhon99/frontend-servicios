import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/api/auditoria.api", () => ({
  getAuditoriasRequest: vi.fn(),
}));

import { getAuditoriasRequest } from "../../src/api/auditoria.api";
import AuditoriaPage from "../../src/pages/auditoria/AuditoriaPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <AuditoriaPage />
    </MemoryRouter>
  );

describe("AuditoriaPage", () => {
  beforeEach(() => {
    getAuditoriasRequest.mockReset();
  });

  it("renderiza eventos de auditoria y abre su detalle", async () => {
    getAuditoriasRequest.mockResolvedValue({
      data: [
        {
          id_auditoria: 3,
          fecha_evento: "2026-05-07T12:00:00.000Z",
          realizado_por_nombre: "Admin",
          realizado_por_username: "admin",
          tabla_afectada: "clientes",
          id_registro: 9,
          accion: "ACTUALIZAR",
          descripcion: "Cliente actualizado",
          valores_anteriores: { telefono: "111" },
          valores_nuevos: { telefono: "222" },
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Cliente actualizado")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Detalle/i }));

    expect(
      screen.getByRole("heading", { name: /evento de auditoria #3/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/id registro/i)).toBeInTheDocument();
    expect(screen.getByText(/valores anteriores/i)).toBeInTheDocument();
    expect(screen.getByText(/valores nuevos/i)).toBeInTheDocument();
    expect(screen.getByText(/"telefono": "111"/i)).toBeInTheDocument();
    expect(screen.getByText(/"telefono": "222"/i)).toBeInTheDocument();
  });
});
