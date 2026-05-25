import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../../src/api/ordenes.api", () => ({
  getOrdenByIdRequest: vi.fn(),
}));

vi.mock("../../src/api/documentos.api", () => ({
  abrirInformeOrdenRequest: vi.fn(),
  abrirTicketServicioRequest: vi.fn(),
}));

vi.mock("../../src/pages/ordenes/components/EvidenciasOrdenSection", () => ({
  default: ({ idOrden }) => <div>Evidencias mock {idOrden}</div>,
}));

vi.mock("../../src/pages/ordenes/components/FinanzasOrdenSection", () => ({
  default: ({ idOrden }) => <div>Finanzas mock {idOrden}</div>,
}));

import {
  abrirInformeOrdenRequest,
  abrirTicketServicioRequest,
} from "../../src/api/documentos.api";
import { getOrdenByIdRequest } from "../../src/api/ordenes.api";
import OrdenDetallePage from "../../src/pages/ordenes/OrdenDetallePage";

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/ordenes/18"]}>
      <Routes>
        <Route path="/ordenes/:id" element={<OrdenDetallePage />} />
      </Routes>
    </MemoryRouter>
  );

describe("OrdenDetallePage", () => {
  beforeEach(() => {
    getOrdenByIdRequest.mockReset();
    abrirInformeOrdenRequest.mockReset();
    abrirTicketServicioRequest.mockReset();
  });

  it("carga el detalle de la orden y permite abrir PDFs", async () => {
    getOrdenByIdRequest.mockResolvedValue({
      id_orden_trabajo: 18,
      numero_orden: "ORD-0018",
      cliente: "Client One",
      nombre_propiedad: "Office",
      estado: "EN_PROCESO",
      fecha_servicio: "2026-05-07",
      tipo_visita: "PROGRAMADA",
      origen: "MANUAL",
      cuadrilla: null,
      tecnicos: "Ana",
      subtotal: 120,
      descuento: 0,
      total_orden: 120,
      duracion_real_min: 55,
      observaciones_previas: "Prior note",
      observaciones_finales: "Final note",
      confirmado_por_cliente: true,
      nombre_recibe: "John",
      firma_cliente_url: "https://example.com/sign.png",
      detalles: [
        {
          id_orden_detalle: 1,
          servicio: "Deep cleaning",
          categoria_servicio: "Cleaning",
          descripcion_servicio: "Floor work",
          requiere_materiales: true,
          tipo_material: "Soap",
          precio_material_extra: 12,
          cantidad: 1,
          precio_unitario: 108,
          subtotal: 120,
          duracion_estimada_min: 60,
          duracion_real_min: 55,
          estado: "EN_PROCESO",
        },
      ],
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "ORD-0018" })).toBeInTheDocument()
    );

    expect(screen.getByText(/Client One/i)).toBeInTheDocument();
    expect(screen.getByText(/Deep cleaning/i)).toBeInTheDocument();
    expect(screen.getByText(/Evidencias mock 18/i)).toBeInTheDocument();
    expect(screen.getByText(/Finanzas mock 18/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /PDF Ticket/i }));
    expect(abrirTicketServicioRequest).toHaveBeenCalledWith(18, undefined);

    await userEvent.click(screen.getByRole("button", { name: /PDF Informe/i }));
    expect(abrirInformeOrdenRequest).toHaveBeenCalledWith(18, undefined);
  });
});
