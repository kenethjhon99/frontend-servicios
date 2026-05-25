import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/api/programaciones.api", () => ({
  getProgramacionesRequest: vi.fn(),
  createProgramacionRequest: vi.fn(),
  updateProgramacionRequest: vi.fn(),
  changeEstadoProgramacionRequest: vi.fn(),
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
  changeEstadoProgramacionRequest,
  getProgramacionesRequest,
} from "../../src/api/programaciones.api";
import ProgramacionesPage from "../../src/pages/programaciones/ProgramacionesPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProgramacionesPage />
    </MemoryRouter>
  );

describe("ProgramacionesPage", () => {
  beforeEach(() => {
    getProgramacionesRequest.mockReset();
    changeEstadoProgramacionRequest.mockReset();
  });

  it("permite pausar una programacion activa", async () => {
    getProgramacionesRequest.mockResolvedValue({
      data: [
        {
          id_programacion: 12,
          cliente: "Client One",
          nombre_propiedad: "Main Office",
          servicio: "Cleaning",
          categoria_servicio: "Maintenance",
          empleado_responsable: "Ana",
          frecuencia: "SEMANAL",
          proxima_fecha: "2026-05-20",
          hora_programada: "08:00",
          precio_acordado: 80,
          prioridad: "MEDIA",
          estado: "ACTIVA",
          estado_visita_actual: "PENDIENTE",
          ultima_ejecucion_fecha: "2026-05-13",
          ultima_ejecucion_estado: "COMPLETADA",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });
    changeEstadoProgramacionRequest.mockResolvedValue({
      id_programacion: 12,
      estado: "PAUSADA",
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Client One")).toBeInTheDocument()
    );
    expect(screen.getByText(/Pending|Pendiente/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Pausar|Pause/i }));

    await waitFor(() =>
      expect(changeEstadoProgramacionRequest).toHaveBeenCalledWith(12, {
        estado: "PAUSADA",
        motivo_cancelacion: null,
      })
    );
  });

  it("solicita motivo y cancela una programacion", async () => {
    getProgramacionesRequest.mockResolvedValue({
      data: [
        {
          id_programacion: 22,
          cliente: "Client Two",
          nombre_propiedad: "Warehouse",
          servicio: "Inspection",
          categoria_servicio: "Visits",
          empleado_responsable: "Luis",
          frecuencia: "UNICA",
          proxima_fecha: "2026-05-22",
          hora_programada: "14:00",
          precio_acordado: 120,
          prioridad: "ALTA",
          estado: "PAUSADA",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });
    changeEstadoProgramacionRequest.mockResolvedValue({
      id_programacion: 22,
      estado: "CANCELADA",
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Client Two")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    await userEvent.type(
      screen.getByPlaceholderText(/motivo|reason/i),
      "Client requested a new date"
    );
    await userEvent.click(screen.getByRole("button", { name: /Confirmar cancelacion|Confirm cancel/i }));

    await waitFor(() =>
      expect(changeEstadoProgramacionRequest).toHaveBeenCalledWith(22, {
        estado: "CANCELADA",
        motivo_cancelacion: "Client requested a new date",
      })
    );
  });

  it("bloquea la cancelacion si no se ingresa motivo", async () => {
    getProgramacionesRequest.mockResolvedValue({
      data: [
        {
          id_programacion: 24,
          cliente: "Client Three",
          nombre_propiedad: "Branch Office",
          servicio: "Maintenance",
          categoria_servicio: "Visits",
          empleado_responsable: "Ana",
          frecuencia: "SEMANAL",
          proxima_fecha: "2026-05-23",
          hora_programada: "10:00",
          precio_acordado: 90,
          prioridad: "MEDIA",
          estado: "ACTIVA",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Client Three")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /Confirmar cancelacion|Confirm cancel/i })
    );

    expect(changeEstadoProgramacionRequest).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        /Debes indicar el motivo de cancelacion\.|You must enter the cancellation reason\./i
      )
    ).toBeInTheDocument();
  });

  it("muestra error si falla pausar una programacion", async () => {
    getProgramacionesRequest.mockResolvedValue({
      data: [
        {
          id_programacion: 31,
          cliente: "Client Four",
          nombre_propiedad: "Clinic",
          servicio: "Inspection",
          categoria_servicio: "Visits",
          empleado_responsable: "Luis",
          frecuencia: "QUINCENAL",
          proxima_fecha: "2026-05-24",
          hora_programada: "11:00",
          precio_acordado: 140,
          prioridad: "ALTA",
          estado: "ACTIVA",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });
    changeEstadoProgramacionRequest.mockRejectedValue({
      response: { data: { error: "No fue posible pausar la programacion" } },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Client Four")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Pausar|Pause/i }));

    await waitFor(() =>
      expect(screen.getByText(/No fue posible pausar la programacion/i)).toBeInTheDocument()
    );
  }, 15000);

  it("muestra cuando una programación todavía no tiene visita generada", async () => {
    getProgramacionesRequest.mockResolvedValue({
      data: [
        {
          id_programacion: 32,
          cliente: "Client Five",
          nombre_propiedad: "Warehouse",
          servicio: "Inspection",
          categoria_servicio: "Visits",
          empleado_responsable: "Ana",
          frecuencia: "MENSUAL",
          proxima_fecha: "2026-05-30",
          hora_programada: "09:00",
          precio_acordado: 95,
          prioridad: "MEDIA",
          estado: "ACTIVA",
          estado_visita_actual: null,
          ultima_ejecucion_fecha: null,
          ultima_ejecucion_estado: null,
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Client Five")).toBeInTheDocument()
    );

    expect(screen.getByText(/Not generated|Sin generar/i)).toBeInTheDocument();
  });
});
