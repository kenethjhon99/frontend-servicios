import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../../src/api/programaciones.api", () => ({
  getProgramacionByIdRequest: vi.fn(),
  getProgramacionEjecucionesRequest: vi.fn(),
  generarEjecucionProgramacionRequest: vi.fn(),
  generarOrdenDesdeEjecucionProgramacionRequest: vi.fn(),
  reprogramarEjecucionProgramacionRequest: vi.fn(),
  cancelarEjecucionProgramacionRequest: vi.fn(),
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
  cancelarEjecucionProgramacionRequest,
  generarEjecucionProgramacionRequest,
  generarOrdenDesdeEjecucionProgramacionRequest,
  getProgramacionByIdRequest,
  getProgramacionEjecucionesRequest,
  reprogramarEjecucionProgramacionRequest,
} from "../../src/api/programaciones.api";
import ProgramacionDetallePage from "../../src/pages/programaciones/ProgramacionDetallePage";

const programacionBase = {
  id_programacion: 12,
  cliente: "Cliente Uno",
  nombre_propiedad: "Casa principal",
  servicio: "Fumigacion",
  empleado_responsable: "Ana",
  frecuencia: "SEMANAL",
  proxima_fecha: "2026-05-20",
  hora_programada: "08:00:00",
  precio_acordado: 150,
  prioridad: "ALTA",
  estado: "ACTIVA",
  duracion_estimada_min: 60,
  descripcion_precio: "Precio base",
  observaciones: "Servicio recurrente",
};

const ejecucionBase = {
  id_ejecucion: 70,
  id_programacion: 12,
  fecha_programada: "2026-05-20",
  fecha_reprogramada: null,
  hora_programada: "08:00:00",
  estado: "PENDIENTE",
  motivo_reprogramacion: null,
  motivo_cancelacion: null,
  id_orden_trabajo: null,
  fecha_generacion_orden: null,
  fecha_cierre: null,
  resultado: null,
  observaciones: null,
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/programaciones/12"]}>
      <Routes>
        <Route path="/programaciones/:id" element={<ProgramacionDetallePage />} />
      </Routes>
    </MemoryRouter>
  );

describe("ProgramacionDetallePage", () => {
  beforeEach(() => {
    getProgramacionByIdRequest.mockReset();
    getProgramacionEjecucionesRequest.mockReset();
    generarEjecucionProgramacionRequest.mockReset();
    generarOrdenDesdeEjecucionProgramacionRequest.mockReset();
    reprogramarEjecucionProgramacionRequest.mockReset();
    cancelarEjecucionProgramacionRequest.mockReset();
  });

  it("muestra historial vacío y permite generar una visita manual", async () => {
    getProgramacionByIdRequest.mockResolvedValue(programacionBase);
    getProgramacionEjecucionesRequest
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([ejecucionBase]);
    generarEjecucionProgramacionRequest.mockResolvedValue({
      ...ejecucionBase,
      id_ejecucion: 71,
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/Cliente Uno/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/Sin visitas todavia|No visits yet/i)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /Generar visita|Generate visit/i })
    );

    await waitFor(() =>
      expect(generarEjecucionProgramacionRequest).toHaveBeenCalledWith("12")
    );
    await waitFor(() =>
      expect(getProgramacionEjecucionesRequest).toHaveBeenCalledTimes(2)
    );
  });

  it("reprograma una visita con nueva fecha y motivo", async () => {
    getProgramacionByIdRequest.mockResolvedValue(programacionBase);
    getProgramacionEjecucionesRequest
      .mockResolvedValueOnce([ejecucionBase])
      .mockResolvedValueOnce([
        { ...ejecucionBase, estado: "REPROGRAMADA", fecha_reprogramada: "2026-05-22" },
        { ...ejecucionBase, id_ejecucion: 71, fecha_programada: "2026-05-22" },
      ]);
    reprogramarEjecucionProgramacionRequest.mockResolvedValue({
      anterior: { ...ejecucionBase, estado: "REPROGRAMADA" },
      nueva: { ...ejecucionBase, id_ejecucion: 71, fecha_programada: "2026-05-22" },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/Cliente Uno/i)).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Reprogramar|Reschedule/i }));
    await userEvent.clear(screen.getByLabelText(/Nueva fecha|New date/i));
    await userEvent.type(screen.getByLabelText(/Nueva fecha|New date/i), "2026-05-22");
    await userEvent.type(
      screen.getByPlaceholderText(/Motivo por el que se mueve la visita|Reason for moving the visit/i),
      "Cliente solicito cambio"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Notas para la nueva visita pendiente|Notes for the new pending visit/i),
      "Mover por acceso restringido"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Confirmar reprogramacion|Confirm reschedule/i })
    );

    await waitFor(() =>
      expect(reprogramarEjecucionProgramacionRequest).toHaveBeenCalledWith(70, {
        nueva_fecha: "2026-05-22",
        nueva_hora: "08:00:00",
        motivo_reprogramacion: "Cliente solicito cambio",
        observaciones: "Mover por acceso restringido",
      })
    );
  });

  it("genera una orden desde una visita pendiente y recarga el detalle", async () => {
    getProgramacionByIdRequest.mockResolvedValue(programacionBase);
    getProgramacionEjecucionesRequest
      .mockResolvedValueOnce([ejecucionBase])
      .mockResolvedValueOnce([{ ...ejecucionBase, estado: "GENERADA", id_orden_trabajo: 401 }]);
    generarOrdenDesdeEjecucionProgramacionRequest.mockResolvedValue({
      id_orden_trabajo: 401,
      total_orden: 150,
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/Cliente Uno/i)).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Generar orden|Generate order/i }));

    await waitFor(() =>
      expect(generarOrdenDesdeEjecucionProgramacionRequest).toHaveBeenCalledWith(70)
    );
    await waitFor(() =>
      expect(getProgramacionEjecucionesRequest).toHaveBeenCalledTimes(2)
    );
  });

  it("cancela una visita con motivo", async () => {
    getProgramacionByIdRequest.mockResolvedValue(programacionBase);
    getProgramacionEjecucionesRequest
      .mockResolvedValueOnce([ejecucionBase])
      .mockResolvedValueOnce([{ ...ejecucionBase, estado: "CANCELADA", motivo_cancelacion: "Cliente no disponible" }]);
    cancelarEjecucionProgramacionRequest.mockResolvedValue({
      ...ejecucionBase,
      estado: "CANCELADA",
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/Cliente Uno/i)).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Cancelar visita|Cancel visit/i }));
    await userEvent.type(
      screen.getByPlaceholderText(/Motivo de cancelacion de esta visita|Reason for cancelling this visit/i),
      "Cliente no disponible"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Confirmar cancelacion de visita|Confirm visit cancellation/i })
    );

    await waitFor(() =>
      expect(cancelarEjecucionProgramacionRequest).toHaveBeenCalledWith(70, {
        motivo_cancelacion: "Cliente no disponible",
      })
    );
  });

  it("muestra validación si se intenta cancelar sin motivo", async () => {
    getProgramacionByIdRequest.mockResolvedValue(programacionBase);
    getProgramacionEjecucionesRequest.mockResolvedValue([ejecucionBase]);

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/Cliente Uno/i)).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Cancelar visita|Cancel visit/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /Confirmar cancelacion de visita|Confirm visit cancellation/i })
    );

    expect(cancelarEjecucionProgramacionRequest).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        /Debes indicar el motivo de cancelacion de la visita|You must enter the visit cancellation reason/i
      )
    ).toBeInTheDocument();
  });
});
