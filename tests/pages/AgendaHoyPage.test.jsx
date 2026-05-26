import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/api/agenda.api", () => ({
  getAgendaDiaRequest: vi.fn(),
}));

vi.mock("../../src/api/programaciones.api", () => ({
  generarOrdenDesdeProgramacionRequest: vi.fn(),
  generarOrdenDesdeEjecucionProgramacionRequest: vi.fn(),
}));

vi.mock("../../src/context/toast.context", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

import { getAgendaDiaRequest } from "../../src/api/agenda.api";
import {
  generarOrdenDesdeProgramacionRequest,
  generarOrdenDesdeEjecucionProgramacionRequest,
} from "../../src/api/programaciones.api";
import { changeEstadoOrdenRequest } from "../../src/api/ordenes.api";
import AgendaHoyPage from "../../src/pages/agenda/AgendaHoyPage";

vi.mock("../../src/api/ordenes.api", () => ({
  changeEstadoOrdenRequest: vi.fn(),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <AgendaHoyPage />
    </MemoryRouter>
  );

describe("AgendaHoyPage", () => {
  beforeEach(() => {
    getAgendaDiaRequest.mockReset();
    generarOrdenDesdeProgramacionRequest.mockReset();
    generarOrdenDesdeEjecucionProgramacionRequest.mockReset();
    changeEstadoOrdenRequest.mockReset();
  });

  it("consulta la agenda del dia y muestra resumenes y tablas", async () => {
    getAgendaDiaRequest.mockResolvedValue({
      resumen: {
        total_programaciones: 2,
        total_programaciones_vencidas: 1,
        total_ordenes: 1,
        total_vencimientos_credito: 1,
        total_cobranza_alertas: 1,
      },
      programaciones: [
        {
          id_programacion: 1,
          hora_programada: "08:00",
          cliente: "Client One",
          nombre_propiedad: "Office",
          servicio: "Cleaning",
          frecuencia: "SEMANAL",
          estado_visita_actual: "PENDIENTE",
          id_ejecucion_dia: 15,
          id_orden_trabajo_visita: null,
          ultima_ejecucion_fecha: "2026-05-06",
          ultima_ejecucion_estado: "COMPLETADA",
          prioridad: "MEDIA",
          precio_acordado: 75,
        },
      ],
      programaciones_vencidas: [
        {
          id_programacion: 3,
          hora_programada: "07:30",
          cliente: "Client Overdue",
          nombre_propiedad: "Warehouse",
          servicio: "Inspection",
          frecuencia: "SEMANAL",
          estado_visita_actual: null,
          id_ejecucion_dia: null,
          id_orden_trabajo_visita: null,
          ultima_ejecucion_fecha: "2026-05-01",
          ultima_ejecucion_estado: "COMPLETADA",
          prioridad: "ALTA",
          precio_acordado: 120,
          proxima_fecha: "2026-05-08",
        },
      ],
      ordenes: [
        {
          id_orden_trabajo: 8,
          hora_inicio_programada: "10:00",
          numero_orden: "ORD-0008",
          cliente: "Client One",
          nombre_propiedad: "Office",
          tipo_visita: "PROGRAMADA",
          estado: "PENDIENTE",
          total_orden: 140,
        },
      ],
      vencimientos_credito: [
        {
          id_credito: 5,
          cliente: "Client Two",
          numero_orden: "ORD-0010",
          estado: "PENDIENTE",
          saldo_pendiente: 60,
          fecha_vencimiento: "2026-05-07",
        },
      ],
      cobranza_alertas: [
        {
          id_credito: 9,
          id_cliente: 4,
          cliente: "Client Debt",
          numero_orden: "ORD-0012",
          saldo_pendiente: 180,
          dias_vencido: 2,
          ultimo_seguimiento_fecha: "2026-05-07",
          ultimo_seguimiento_resultado: "PROMESA_PAGO",
          proximo_contacto: "2026-05-09",
          ultima_nota_seguimiento: "Llamar de nuevo por la tarde",
        },
      ],
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText("Client One").length).toBeGreaterThan(0)
    );

    expect(screen.getByText("Client Overdue")).toBeInTheDocument();
    expect(screen.getByText("ORD-0008")).toBeInTheDocument();
    expect(screen.getByText("Client Two")).toBeInTheDocument();
    expect(screen.getAllByText("Client Debt").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pending|Pendiente/i).length).toBeGreaterThan(0);

    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    await userEvent.clear(dateInput);
    await userEvent.type(dateInput, "2026-05-08");
    await userEvent.click(screen.getByRole("button", { name: /Check|Consultar/i }));

    await waitFor(() =>
      expect(getAgendaDiaRequest).toHaveBeenLastCalledWith("2026-05-08")
    );
  });

  it("muestra cuando la programacion del dia aun no tiene visita generada", async () => {
    getAgendaDiaRequest.mockResolvedValue({
      resumen: {
        total_programaciones: 1,
        total_programaciones_vencidas: 0,
        total_ordenes: 0,
        total_vencimientos_credito: 0,
      },
      programaciones: [
        {
          id_programacion: 2,
          hora_programada: "09:30",
          cliente: "Client Three",
          nombre_propiedad: "Plant",
          servicio: "Review",
          frecuencia: "MENSUAL",
          estado_visita_actual: null,
          id_ejecucion_dia: null,
          id_orden_trabajo_visita: null,
          ultima_ejecucion_fecha: null,
          ultima_ejecucion_estado: null,
          prioridad: "BAJA",
          precio_acordado: 50,
        },
      ],
      programaciones_vencidas: [],
      ordenes: [],
      vencimientos_credito: [],
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Client Three")).toBeInTheDocument()
    );

    expect(screen.getByText(/Not generated|Sin generar/i)).toBeInTheDocument();
  });

  it("permite generar visita desde agenda cuando no existe una visita del dia", async () => {
    getAgendaDiaRequest
      .mockResolvedValueOnce({
        resumen: {
          total_programaciones: 1,
          total_programaciones_vencidas: 0,
          total_ordenes: 0,
          total_vencimientos_credito: 0,
        },
        programaciones: [
          {
            id_programacion: 2,
            hora_programada: "09:30",
            cliente: "Client Three",
            nombre_propiedad: "Plant",
            servicio: "Review",
            frecuencia: "MENSUAL",
            estado_visita_actual: null,
            id_ejecucion_dia: null,
            id_orden_trabajo_visita: null,
            ultima_ejecucion_fecha: null,
            ultima_ejecucion_estado: null,
            prioridad: "BAJA",
            precio_acordado: 50,
          },
        ],
        programaciones_vencidas: [],
        ordenes: [],
        vencimientos_credito: [],
      })
      .mockResolvedValueOnce({
        resumen: {
          total_programaciones: 1,
          total_programaciones_vencidas: 0,
          total_ordenes: 0,
          total_vencimientos_credito: 0,
        },
        programaciones: [
          {
            id_programacion: 2,
            hora_programada: "09:30",
            cliente: "Client Three",
            nombre_propiedad: "Plant",
            servicio: "Review",
            frecuencia: "MENSUAL",
            estado_visita_actual: "PENDIENTE",
            id_ejecucion_dia: 44,
            id_orden_trabajo_visita: null,
            ultima_ejecucion_fecha: null,
            ultima_ejecucion_estado: null,
            prioridad: "BAJA",
            precio_acordado: 50,
          },
        ],
        programaciones_vencidas: [],
        ordenes: [],
        vencimientos_credito: [],
      });
    generarOrdenDesdeProgramacionRequest.mockResolvedValue({ id_orden_trabajo: 44 });

    renderPage();

    await waitFor(() => expect(screen.getByText("Client Three")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /Generate order|Generar orden/i }));

    await waitFor(() =>
      expect(generarOrdenDesdeProgramacionRequest).toHaveBeenCalledWith(2)
    );
    await waitFor(() => expect(getAgendaDiaRequest).toHaveBeenCalledTimes(2));
  });

  it("permite generar orden desde agenda cuando la visita ya esta pendiente", async () => {
    getAgendaDiaRequest
      .mockResolvedValueOnce({
        resumen: {
          total_programaciones: 1,
          total_programaciones_vencidas: 0,
          total_ordenes: 0,
          total_vencimientos_credito: 0,
        },
        programaciones: [
          {
            id_programacion: 1,
            hora_programada: "08:00",
            cliente: "Client One",
            nombre_propiedad: "Office",
            servicio: "Cleaning",
            frecuencia: "SEMANAL",
            estado_visita_actual: "PENDIENTE",
            id_ejecucion_dia: 15,
            id_orden_trabajo_visita: null,
            ultima_ejecucion_fecha: "2026-05-06",
            ultima_ejecucion_estado: "COMPLETADA",
            prioridad: "MEDIA",
            precio_acordado: 75,
          },
        ],
        programaciones_vencidas: [],
        ordenes: [],
        vencimientos_credito: [],
      })
      .mockResolvedValueOnce({
        resumen: {
          total_programaciones: 1,
          total_programaciones_vencidas: 0,
          total_ordenes: 1,
          total_vencimientos_credito: 0,
        },
        programaciones: [
          {
            id_programacion: 1,
            hora_programada: "08:00",
            cliente: "Client One",
            nombre_propiedad: "Office",
            servicio: "Cleaning",
            frecuencia: "SEMANAL",
            estado_visita_actual: "GENERADA",
            id_ejecucion_dia: 15,
            id_orden_trabajo_visita: 88,
            ultima_ejecucion_fecha: "2026-05-06",
            ultima_ejecucion_estado: "COMPLETADA",
            prioridad: "MEDIA",
            precio_acordado: 75,
          },
        ],
        programaciones_vencidas: [],
        ordenes: [],
        vencimientos_credito: [],
      });
    generarOrdenDesdeEjecucionProgramacionRequest.mockResolvedValue({ id_orden_trabajo: 88 });

    renderPage();

    await waitFor(() => expect(screen.getAllByText("Client One").length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole("button", { name: /Generate order|Generar orden/i }));

    await waitFor(() =>
      expect(generarOrdenDesdeEjecucionProgramacionRequest).toHaveBeenCalledWith(15)
    );
    await waitFor(() => expect(getAgendaDiaRequest).toHaveBeenCalledTimes(2));
  });

  it("aplica el filtro rapido de vencidas para enfocarse en atrasadas", async () => {
    getAgendaDiaRequest.mockResolvedValue({
      resumen: {
        total_programaciones: 1,
        total_programaciones_vencidas: 1,
        total_ordenes: 0,
        total_vencimientos_credito: 0,
      },
      programaciones: [
        {
          id_programacion: 1,
          hora_programada: "08:00",
          cliente: "Client One",
          nombre_propiedad: "Office",
          servicio: "Cleaning",
          frecuencia: "SEMANAL",
          estado_visita_actual: "PENDIENTE",
          id_ejecucion_dia: 15,
          id_orden_trabajo_visita: null,
          ultima_ejecucion_fecha: "2026-05-06",
          ultima_ejecucion_estado: "COMPLETADA",
          prioridad: "MEDIA",
          precio_acordado: 75,
        },
      ],
      programaciones_vencidas: [
        {
          id_programacion: 3,
          hora_programada: "07:30",
          cliente: "Client Overdue",
          nombre_propiedad: "Warehouse",
          servicio: "Inspection",
          frecuencia: "SEMANAL",
          estado_visita_actual: null,
          id_ejecucion_dia: null,
          id_orden_trabajo_visita: null,
          ultima_ejecucion_fecha: "2026-05-01",
          ultima_ejecucion_estado: "COMPLETADA",
          prioridad: "ALTA",
          precio_acordado: 120,
        },
      ],
      ordenes: [],
      vencimientos_credito: [],
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText("Client One").length).toBeGreaterThan(0),
    );
    await userEvent.click(screen.getByRole("button", { name: /Only overdue|Solo vencidas/i }));

    expect(screen.queryByText("Client One")).not.toBeInTheDocument();
    expect(screen.getByText("Client Overdue")).toBeInTheDocument();
  });

  it("filtra por responsable e inicia una orden desde agenda", async () => {
    getAgendaDiaRequest
      .mockResolvedValueOnce({
        resumen: {
          total_programaciones: 2,
          total_programaciones_vencidas: 0,
          total_ordenes: 1,
          total_vencimientos_credito: 0,
        },
        programaciones: [
          {
            id_programacion: 1,
            id_empleado_responsable: 5,
            empleado_responsable: "Ana",
            hora_programada: "08:00",
            cliente: "Client One",
            nombre_propiedad: "Office",
            servicio: "Cleaning",
            frecuencia: "SEMANAL",
            estado_visita_actual: "PENDIENTE",
            id_ejecucion_dia: 15,
            id_orden_trabajo_visita: null,
            ultima_ejecucion_fecha: "2026-05-06",
            ultima_ejecucion_estado: "COMPLETADA",
            prioridad: "MEDIA",
            precio_acordado: 75,
            proxima_fecha: "2026-05-11",
          },
          {
            id_programacion: 2,
            id_empleado_responsable: 6,
            empleado_responsable: "Luis",
            hora_programada: "09:00",
            cliente: "Client Two",
            nombre_propiedad: "Store",
            servicio: "Review",
            frecuencia: "MENSUAL",
            estado_visita_actual: null,
            id_ejecucion_dia: null,
            id_orden_trabajo_visita: null,
            ultima_ejecucion_fecha: null,
            ultima_ejecucion_estado: null,
            prioridad: "ALTA",
            precio_acordado: 80,
            proxima_fecha: "2026-05-11",
          },
        ],
        programaciones_vencidas: [],
        ordenes: [
          {
            id_orden_trabajo: 8,
            hora_inicio_programada: "10:00",
            numero_orden: "ORD-0008",
            cliente: "Client One",
            nombre_propiedad: "Office",
            tipo_visita: "PROGRAMADA",
            tecnicos: "Ana",
            estado: "PENDIENTE",
            total_orden: 140,
          },
        ],
        vencimientos_credito: [],
      })
      .mockResolvedValueOnce({
        resumen: {
          total_programaciones: 2,
          total_programaciones_vencidas: 0,
          total_ordenes: 1,
          total_vencimientos_credito: 0,
        },
        programaciones: [
          {
            id_programacion: 1,
            id_empleado_responsable: 5,
            empleado_responsable: "Ana",
            hora_programada: "08:00",
            cliente: "Client One",
            nombre_propiedad: "Office",
            servicio: "Cleaning",
            frecuencia: "SEMANAL",
            estado_visita_actual: "PENDIENTE",
            id_ejecucion_dia: 15,
            id_orden_trabajo_visita: null,
            ultima_ejecucion_fecha: "2026-05-06",
            ultima_ejecucion_estado: "COMPLETADA",
            prioridad: "MEDIA",
            precio_acordado: 75,
            proxima_fecha: "2026-05-11",
          },
        ],
        programaciones_vencidas: [],
        ordenes: [
          {
            id_orden_trabajo: 8,
            hora_inicio_programada: "10:00",
            numero_orden: "ORD-0008",
            cliente: "Client One",
            nombre_propiedad: "Office",
            tipo_visita: "PROGRAMADA",
            tecnicos: "Ana",
            estado: "EN_PROCESO",
            total_orden: 140,
          },
        ],
        vencimientos_credito: [],
      });
    changeEstadoOrdenRequest.mockResolvedValue({ id_orden_trabajo: 8, estado: "EN_PROCESO" });

    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText("Client One").length).toBeGreaterThan(0)
    );

    await userEvent.selectOptions(screen.getByRole("combobox"), "5");
    expect(screen.queryByText("Client Two")).not.toBeInTheDocument();
    expect(screen.getAllByText("Client One").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: /Start order|Iniciar orden/i }));

    await waitFor(() =>
      expect(changeEstadoOrdenRequest).toHaveBeenCalledWith(8, { estado: "EN_PROCESO" })
    );
    await waitFor(() => expect(getAgendaDiaRequest).toHaveBeenCalledTimes(2));
  });
});
