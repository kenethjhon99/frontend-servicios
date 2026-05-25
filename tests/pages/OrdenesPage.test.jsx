import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/api/ordenes.api", () => ({
  getOrdenesRequest: vi.fn(),
  createOrdenRequest: vi.fn(),
  changeEstadoOrdenRequest: vi.fn(),
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
  changeEstadoOrdenRequest,
  getOrdenesRequest,
} from "../../src/api/ordenes.api";
import OrdenesPage from "../../src/pages/ordenes/OrdenesPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <OrdenesPage />
    </MemoryRouter>
  );

describe("OrdenesPage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    getOrdenesRequest.mockReset();
    changeEstadoOrdenRequest.mockReset();
  });

  it("permite iniciar una orden pendiente y abrir su detalle", async () => {
    getOrdenesRequest.mockResolvedValue({
      data: [
        {
          id_orden_trabajo: 18,
          numero_orden: "ORD-0018",
          fecha_servicio: "2026-05-07",
          cliente: "Client One",
          nombre_propiedad: "Office",
          tecnicos: "Ana",
          tipo_visita: "PROGRAMADA",
          origen: "MANUAL",
          total_orden: 150,
          estado: "PENDIENTE",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });
    changeEstadoOrdenRequest.mockResolvedValue({
      id_orden_trabajo: 18,
      estado: "EN_PROCESO",
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("ORD-0018")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Detalle/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/ordenes/18");

    await userEvent.click(screen.getByRole("button", { name: /Iniciar/i }));

    await waitFor(() =>
      expect(changeEstadoOrdenRequest).toHaveBeenCalledWith(18, {
        estado: "EN_PROCESO",
        motivo_cancelacion: null,
      })
    );
  });

  it("solicita motivo para cancelar una orden", async () => {
    getOrdenesRequest.mockResolvedValue({
      data: [
        {
          id_orden_trabajo: 22,
          numero_orden: "ORD-0022",
          fecha_servicio: "2026-05-09",
          cliente: "Client Two",
          nombre_propiedad: "Warehouse",
          tecnicos: "Luis",
          tipo_visita: "URGENTE",
          origen: "MANUAL",
          total_orden: 225,
          estado: "PROGRAMADA",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });
    changeEstadoOrdenRequest.mockResolvedValue({
      id_orden_trabajo: 22,
      estado: "CANCELADA",
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("ORD-0022")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    await userEvent.type(
      screen.getByPlaceholderText(/motivo|reason/i),
      "Customer postponed service"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Confirmar cancelacion|Confirm cancel/i })
    );

    await waitFor(() =>
      expect(changeEstadoOrdenRequest).toHaveBeenCalledWith(22, {
        estado: "CANCELADA",
        motivo_cancelacion: "Customer postponed service",
      })
    );
  }, 15000);

  it("bloquea la cancelacion si no se ingresa motivo", async () => {
    getOrdenesRequest.mockResolvedValue({
      data: [
        {
          id_orden_trabajo: 25,
          numero_orden: "ORD-0025",
          fecha_servicio: "2026-05-10",
          cliente: "Client Three",
          nombre_propiedad: "Store",
          tecnicos: "Marta",
          tipo_visita: "PROGRAMADA",
          origen: "MANUAL",
          total_orden: 190,
          estado: "PROGRAMADA",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("ORD-0025")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /Confirmar cancelacion|Confirm cancel/i })
    );

    expect(changeEstadoOrdenRequest).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        /Debes indicar el motivo de cancelacion\.|You must enter the cancellation reason\./i
      )
    ).toBeInTheDocument();
  });

  it("muestra error si falla iniciar una orden", async () => {
    getOrdenesRequest.mockResolvedValue({
      data: [
        {
          id_orden_trabajo: 30,
          numero_orden: "ORD-0030",
          fecha_servicio: "2026-05-11",
          cliente: "Client Four",
          nombre_propiedad: "Condo",
          tecnicos: "Luis",
          tipo_visita: "URGENTE",
          origen: "MANUAL",
          total_orden: 300,
          estado: "PENDIENTE",
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });
    changeEstadoOrdenRequest.mockRejectedValue({
      response: { data: { error: "No fue posible iniciar la orden" } },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("ORD-0030")).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Iniciar/i }));

    await waitFor(() =>
      expect(screen.getByText(/No fue posible iniciar la orden/i)).toBeInTheDocument()
    );
  }, 15000);
});
