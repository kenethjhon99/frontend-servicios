import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/api/agenda.api", () => ({
  getCalendarioMensualRequest: vi.fn(),
}));

import { getCalendarioMensualRequest } from "../../src/api/agenda.api";
import AgendaMensualPage from "../../src/pages/agenda/AgendaMensualPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <AgendaMensualPage />
    </MemoryRouter>
  );

describe("AgendaMensualPage", () => {
  beforeEach(() => {
    getCalendarioMensualRequest.mockReset();
  });

  it("carga la agenda mensual y recalcula el resumen al consultar", async () => {
    getCalendarioMensualRequest.mockResolvedValue({
      dias: [
        { fecha: "2026-05-01", programaciones: 2, ordenes: 1, vencimientos_credito: 0 },
        { fecha: "2026-05-02", programaciones: 1, ordenes: 2, vencimientos_credito: 1 },
      ],
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("2026-05-01")).toBeInTheDocument()
    );

    expect(screen.getByText("2026-05-02")).toBeInTheDocument();

    const yearInput = screen.getByRole("spinbutton");
    await userEvent.clear(yearInput);
    await userEvent.type(yearInput, "2027");
    await userEvent.click(screen.getByRole("button", { name: /Consultar/i }));

    await waitFor(() =>
      expect(getCalendarioMensualRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({ anio: "2027" })
      )
    );
  });
});
