import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/api/agenda.api", () => ({
  getAgendaRangoRequest: vi.fn(),
}));

vi.mock("../../src/api/programaciones.api", () => ({
  generarOrdenDesdeProgramacionRequest: vi.fn(),
  generarOrdenDesdeEjecucionProgramacionRequest: vi.fn(),
}));

vi.mock("../../src/context/toast.context", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("../../src/utils/csv", () => ({
  downloadAgendaSemanalCsv: vi.fn(),
}));

import { getAgendaRangoRequest } from "../../src/api/agenda.api";
import {
  generarOrdenDesdeProgramacionRequest,
  generarOrdenDesdeEjecucionProgramacionRequest,
} from "../../src/api/programaciones.api";
import { downloadAgendaSemanalCsv } from "../../src/utils/csv";
import AgendaSemanalPage from "../../src/pages/agenda/AgendaSemanalPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <AgendaSemanalPage />
    </MemoryRouter>,
  );

describe("AgendaSemanalPage", () => {
  const originalPrint = window.print;

  beforeEach(() => {
    getAgendaRangoRequest.mockReset();
    generarOrdenDesdeProgramacionRequest.mockReset();
    generarOrdenDesdeEjecucionProgramacionRequest.mockReset();
    downloadAgendaSemanalCsv.mockReset();
    window.print = vi.fn();
  });

  afterEach(() => {
    window.print = originalPrint;
  });

  it("carga la agenda semanal y permite consultar otro rango", async () => {
    getAgendaRangoRequest.mockResolvedValue({
      fecha_desde: "2026-05-11",
      fecha_hasta: "2026-05-17",
      programaciones: [
        {
          id_programacion: 1,
          id_empleado_responsable: 5,
          proxima_fecha: "2026-05-12",
          hora_programada: "08:00",
          cliente: "Client One",
          servicio: "Maintenance",
          empleado_responsable: "Ana",
          id_ejecucion_actual: null,
          id_orden_trabajo_visita: null,
          estado_visita_actual: "PENDIENTE",
        },
      ],
      ordenes: [
        {
          id_orden_trabajo: 8,
          fecha_servicio: "2026-05-12",
          numero_orden: "ORD-0008",
          cliente: "Client One",
          hora_inicio_programada: "09:00",
          estado: "PROGRAMADA",
        },
      ],
      resumen: {
        total_programaciones: 1,
        total_ordenes: 1,
      },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/Agenda semanal|Weekly agenda/i)).toBeInTheDocument(),
    );

    expect(
      screen.getByText(/Resumen semanal por responsable|Weekly summary by owner/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Client One").length).toBeGreaterThan(0);
    expect(screen.getByText("ORD-0008")).toBeInTheDocument();

    const dateInputs = screen.getAllByDisplayValue(/2026-05-/);
    await userEvent.clear(dateInputs[0]);
    await userEvent.type(dateInputs[0], "2026-05-18");
    await userEvent.clear(dateInputs[1]);
    await userEvent.type(dateInputs[1], "2026-05-24");
    await userEvent.click(screen.getByRole("button", { name: /Consultar|Check/i }));

    await waitFor(() =>
      expect(getAgendaRangoRequest).toHaveBeenLastCalledWith({
        fecha_desde: "2026-05-18",
        fecha_hasta: "2026-05-24",
      }),
    );
  });

  it("filtra por responsable y genera orden directa desde la semana", async () => {
    getAgendaRangoRequest.mockResolvedValue({
      fecha_desde: "2026-05-11",
      fecha_hasta: "2026-05-17",
      programaciones: [
        {
          id_programacion: 1,
          id_empleado_responsable: 5,
          proxima_fecha: "2026-05-12",
          hora_programada: "08:00",
          cliente: "Client One",
          servicio: "Maintenance",
          empleado_responsable: "Ana",
          id_ejecucion_actual: null,
          id_orden_trabajo_visita: null,
          estado_visita_actual: null,
        },
        {
          id_programacion: 2,
          id_empleado_responsable: 6,
          proxima_fecha: "2026-05-13",
          hora_programada: "10:00",
          cliente: "Client Two",
          servicio: "Cleaning",
          empleado_responsable: "Luis",
          id_ejecucion_actual: 12,
          id_orden_trabajo_visita: null,
          estado_visita_actual: "PENDIENTE",
        },
      ],
      ordenes: [],
      resumen: {
        total_programaciones: 2,
        total_ordenes: 0,
      },
    });
    generarOrdenDesdeProgramacionRequest.mockResolvedValue({ id_orden_trabajo: 9 });

    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText(/Client One|Client Two/).length).toBeGreaterThan(0),
    );

    const ownerSelect = screen.getByRole("combobox");
    await userEvent.selectOptions(ownerSelect, "5");

    expect(screen.getAllByText("Ana").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Client One").length).toBeGreaterThan(0);
    expect(screen.queryByText("Client Two")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Generate order|Generar orden/i }));

    await waitFor(() =>
      expect(generarOrdenDesdeProgramacionRequest).toHaveBeenCalledWith(1),
    );
  });

  it("permite imprimir el reporte semanal", async () => {
    getAgendaRangoRequest.mockResolvedValue({
      fecha_desde: "2026-05-11",
      fecha_hasta: "2026-05-17",
      programaciones: [],
      ordenes: [],
      resumen: {
        total_programaciones: 0,
        total_ordenes: 0,
      },
    });

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Imprimir reporte semanal|Print weekly report/i }),
      ).toBeInTheDocument(),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Imprimir reporte semanal|Print weekly report/i }),
    );

    expect(window.print).toHaveBeenCalled();
  });

  it("permite exportar el reporte semanal a CSV", async () => {
    getAgendaRangoRequest.mockResolvedValue({
      fecha_desde: "2026-05-11",
      fecha_hasta: "2026-05-17",
      programaciones: [],
      ordenes: [],
      resumen: {
        total_programaciones: 0,
        total_ordenes: 0,
      },
    });

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Exportar CSV semanal|Export weekly CSV/i }),
      ).toBeInTheDocument(),
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Exportar CSV semanal|Export weekly CSV/i }),
    );

    expect(downloadAgendaSemanalCsv).toHaveBeenCalled();
  });
});
