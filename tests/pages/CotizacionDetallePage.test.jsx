import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/api/cotizaciones.api", () => ({
  getCotizacionByIdRequest: vi.fn(),
  updateCotizacionRequest: vi.fn(),
  changeEstadoCotizacionRequest: vi.fn(),
  convertirCotizacionRequest: vi.fn(),
}));

vi.mock("../../src/api/clientes.api", () => ({
  getClientesRequest: vi.fn(() => Promise.resolve([])),
  getPropiedadesByClienteRequest: vi.fn(() => Promise.resolve([])),
}));

vi.mock("../../src/api/servicios.api", () => ({
  getServiciosRequest: vi.fn(() => Promise.resolve([])),
}));

vi.mock("../../src/api/documentos.api", () => ({
  abrirCotizacionRequest: vi.fn(),
}));

vi.mock("../../src/api/empleados.api", () => ({
  getEmpleadosRequest: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "5" }),
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
  convertirCotizacionRequest,
  getCotizacionByIdRequest,
} from "../../src/api/cotizaciones.api";
import { getEmpleadosRequest } from "../../src/api/empleados.api";
import CotizacionDetallePage from "../../src/pages/cotizaciones/CotizacionDetallePage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <CotizacionDetallePage />
    </MemoryRouter>
  );

describe("CotizacionDetallePage", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    getCotizacionByIdRequest.mockReset();
    convertirCotizacionRequest.mockReset();
    getEmpleadosRequest.mockReset();
  });

  it("permite convertir una cotizacion aprobada en orden con empleados opcionales", async () => {
    getCotizacionByIdRequest.mockResolvedValue({
      id_cotizacion: 5,
      numero_cotizacion: "COT-20260428-00005",
      fecha_cotizacion: "2026-04-28",
      vigencia_hasta: "2026-05-10",
      subtotal: 200,
      descuento: 20,
      total: 180,
      estado: "APROBADA",
      cliente: "Cliente Prueba",
      nombre_propiedad: "Bodega Central",
      observaciones: "Texto de prueba",
      detalles: [
        {
          id_cotizacion_detalle: 1,
          servicio: "Poda",
          descripcion: "Poda de jardin",
          cantidad: 2,
          precio_unitario: 100,
          subtotal: 200,
          descripcion_precio: "",
        },
      ],
    });

    convertirCotizacionRequest.mockResolvedValue({
      cotizacion: { id_cotizacion: 5, estado: "CONVERTIDA" },
      orden: { id_orden_trabajo: 77 },
    });
    getEmpleadosRequest.mockResolvedValue({
      data: [{ id_empleado: 20, nombre_completo: "Maria Lopez" }],
      pagination: { page: 1, limit: 50, total: 1, total_pages: 1 },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("COT-20260428-00005")).toBeInTheDocument()
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Convertir en orden de trabajo/i })
    );

    await userEvent.selectOptions(
      screen.getByRole("listbox", { name: /Empleados asignados/i }),
      "20"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Observaciones previas para la orden/i),
      "Ir por acceso principal"
    );

    const dateInput = screen.getByLabelText(/Fecha de servicio/i);
    fireEvent.change(dateInput, { target: { value: "2026-05-03" } });

    await userEvent.click(screen.getByRole("button", { name: /Crear orden/i }));

    await waitFor(() =>
      expect(convertirCotizacionRequest).toHaveBeenCalledWith(5, {
        fecha_servicio: "2026-05-03",
        id_empleados: [20],
        observaciones_previas: "Ir por acceso principal",
      })
    );

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/ordenes/77"));
  });
});
