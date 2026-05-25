import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("../../src/api/clientes.api", () => ({
  getClientesRequest: vi.fn(),
}));

vi.mock("../../src/api/usuarios.api", () => ({
  getUsuariosRequest: vi.fn(),
}));

vi.mock("../../src/api/pagos.api", () => ({
  getResumenCobranzaRequest: vi.fn(),
  aplicarPagoCreditoRequest: vi.fn(),
  createSeguimientoCobranzaRequest: vi.fn(),
}));

vi.mock("../../src/api/documentos.api", () => ({
  abrirEstadoCuentaRequest: vi.fn(),
  abrirReciboAbonoRequest: vi.fn(),
}));

vi.mock("../../src/context/toast.context", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("../../src/utils/csv", () => ({
  downloadCobranzaCsv: vi.fn(),
}));

import { MemoryRouter } from "react-router-dom";
import { getClientesRequest } from "../../src/api/clientes.api";
import { getUsuariosRequest } from "../../src/api/usuarios.api";
import {
  abrirEstadoCuentaRequest,
  abrirReciboAbonoRequest,
} from "../../src/api/documentos.api";
import {
  aplicarPagoCreditoRequest,
  createSeguimientoCobranzaRequest,
  getResumenCobranzaRequest,
} from "../../src/api/pagos.api";
import CobranzaPage from "../../src/pages/pagos/CobranzaPage";
import { downloadCobranzaCsv } from "../../src/utils/csv";

const cobranzaResponse = {
  resumen: {
    saldo_pendiente_total: 600,
    creditos_vencidos: 1,
    creditos_parciales: 1,
    pagos_cobrados_rango: 150,
    clientes_con_saldo: 1,
  },
  buckets: {
    al_dia: { count: 0, saldo_pendiente: 0 },
    vence_1_7: { count: 0, saldo_pendiente: 0 },
    vence_8_30: { count: 1, saldo_pendiente: 600 },
    vence_31_mas: { count: 0, saldo_pendiente: 0 },
  },
  clientes: [
    {
      id_cliente: 7,
      cliente: "Client One",
      id_credito: 21,
      id_orden_trabajo: 99,
      numero_orden: "ORD-0099",
      estado: "PARCIAL",
      fecha_vencimiento: "2026-05-20",
      monto_total: 800,
      monto_pagado: 200,
      saldo_pendiente: 600,
      dias_vencido: 10,
      ultimo_pago_fecha: "2026-05-01",
      ultimo_pago_monto: 200,
      ultimo_seguimiento_fecha: "2026-05-03",
      ultimo_seguimiento_medio: "LLAMADA",
      ultimo_seguimiento_resultado: "PROMESA_PAGO",
      proximo_contacto: "2020-01-01",
      ultima_nota_seguimiento: "Cliente promete abonar el martes.",
      id_usuario_responsable: 3,
      usuario_responsable: "Collector One",
    },
  ],
  reporte: {},
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <CobranzaPage />
    </MemoryRouter>
  );

describe("CobranzaPage", () => {
  const originalPrint = window.print;

  beforeEach(() => {
    navigateMock.mockReset();
    getClientesRequest.mockReset();
    getUsuariosRequest.mockReset();
    getResumenCobranzaRequest.mockReset();
    aplicarPagoCreditoRequest.mockReset();
    createSeguimientoCobranzaRequest.mockReset();
    abrirEstadoCuentaRequest.mockReset();
    abrirReciboAbonoRequest.mockReset();
    downloadCobranzaCsv.mockReset();
    window.print = vi.fn();

    getClientesRequest.mockResolvedValue({
      data: [{ id_cliente: 7, nombre_completo: "Client One" }],
    });
    getUsuariosRequest.mockResolvedValue({
      data: [{ id_usuario: 3, nombre: "Collector One", rol: "COBRADOR", estado: "ACTIVO" }],
    });
    getResumenCobranzaRequest.mockResolvedValue(cobranzaResponse);
  });

  afterEach(() => {
    window.print = originalPrint;
  });

  it("carga el tablero y muestra los KPI de cobranza", async () => {
    renderPage();

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /^Cobranza$|^Collections$/i })
      ).toBeInTheDocument()
    );

    expect(screen.getAllByText("Client One").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$600.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ORD-0099").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: /Foco de cobranza|Collections focus/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Seguimiento por cliente|Follow-up by client/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Alertas prioritarias|Priority alerts/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Requiere seguimiento|Needs follow-up/i).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        /Dar seguimiento al cliente y confirmar fecha de pago|Follow up with the client and confirm a payment date/i
      ).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/1 credito\(s\) activo|1 active credit/i).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/Ultimo movimiento|Last movement/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Siguiente accion|Next action/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Collector One/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/2026-05-03 - Promesa de pago|2026-05-03 - Payment promise/i).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: /Recordatorios de contacto|Contact reminders/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Reporte por estado de seguimiento|Follow-up status report/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Toca hoy|Due now/i).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Promesas de pago|Payment promises/i).length
    ).toBeGreaterThan(0);
  });

  it("aplica filtros y refresca resultados", async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText("Client One").length).toBeGreaterThan(0)
    );

    const dateInputs = screen.getAllByDisplayValue(/2026-/);
    await userEvent.clear(dateInputs[0]);
    await userEvent.type(dateInputs[0], "2026-05-01");
    await userEvent.clear(dateInputs[1]);
    await userEvent.type(dateInputs[1], "2026-05-31");

    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects[0], "PARCIAL");
    await userEvent.selectOptions(selects[1], "7");
    await userEvent.click(screen.getByRole("checkbox", { name: /Solo vencidos|Only overdue/i }));
    await userEvent.click(screen.getByRole("button", { name: /Filtrar|Filter/i }));

    await waitFor(() =>
      expect(getResumenCobranzaRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          fecha_desde: "2026-05-01",
          fecha_hasta: "2026-05-31",
          estado: "PARCIAL",
          id_cliente: "7",
          solo_vencidos: true,
        })
      )
    );
  });

  it("exporta CSV e imprime el reporte", async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Exportar CSV de cobranza|Export collections CSV/i })).toBeInTheDocument()
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Exportar CSV de cobranza|Export collections CSV/i })
    );
    expect(downloadCobranzaCsv).toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: /Imprimir reporte|Print report/i })
    );
    expect(window.print).toHaveBeenCalled();
  });

  it("abre estado de cuenta, aplica abono y navega a la orden", async () => {
    aplicarPagoCreditoRequest.mockResolvedValue({ id_pago_credito: 45 });

    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText("Client One").length).toBeGreaterThan(0)
    );

    await userEvent.click(
      screen.getAllByRole("button", { name: /Estado de cuenta|Account statement/i })[0]
    );

    expect(abrirEstadoCuentaRequest).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        desde: expect.any(String),
        hasta: expect.any(String),
      })
    );

    await userEvent.click(
      screen.getAllByRole("button", { name: /Aplicar abono|Apply payment/i })[0]
    );
    const amountInput = screen.getByPlaceholderText(/Monto a abonar|Payment amount/i);
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, "100");
    await userEvent.click(
      screen.getAllByRole("button", { name: /Aplicar abono|Apply payment/i }).at(-1)
    );

    await waitFor(() =>
      expect(aplicarPagoCreditoRequest).toHaveBeenCalledWith({
        id_credito: 21,
        metodo_pago: "EFECTIVO",
        monto: 100,
        referencia_pago: null,
        observaciones: null,
      })
    );

    await waitFor(() =>
      expect(screen.getByText(/Abono aplicado\. Descarga el recibo|Payment applied\. Download the receipt/i)).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /PDF Recibo|PDF Receipt|PDF/i }));
    expect(abrirReciboAbonoRequest).toHaveBeenCalledWith(45, undefined);

    await userEvent.click(
      screen.getAllByRole("button", { name: /Ver orden|View order/i })[0]
    );
    expect(navigateMock).toHaveBeenCalledWith("/ordenes/99");
  }, 15000);

  it("registra seguimiento de cobranza y refresca el tablero", async () => {
    createSeguimientoCobranzaRequest.mockResolvedValue({ id_seguimiento: 8 });

    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText("Client One").length).toBeGreaterThan(0)
    );

    await userEvent.click(
      screen.getAllByRole("button", { name: /Registrar seguimiento|Register follow-up/i })[0]
    );

    const selects = screen.getAllByRole("combobox");
    await userEvent.selectOptions(selects.at(-3), "WHATSAPP");
    await userEvent.selectOptions(selects.at(-2), "PROMESA_PAGO");
    await userEvent.selectOptions(selects.at(-1), "3");
    await userEvent.type(
      screen.getByPlaceholderText(/Write the contact notes|Escribe las notas del contacto/i),
      "Se confirmo pago para manana"
    );
    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    await userEvent.clear(dateInputs.at(-1));
    await userEvent.type(dateInputs.at(-1), "2026-05-13");
    await userEvent.click(
      screen.getByRole("button", { name: /Save follow-up|Guardar seguimiento/i })
    );

    await waitFor(() =>
      expect(createSeguimientoCobranzaRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          id_cliente: 7,
          id_credito: 21,
          medio_contacto: "WHATSAPP",
          resultado: "PROMESA_PAGO",
          proximo_contacto: "2026-05-13",
          id_usuario_responsable: 3,
        })
      )
    );
    await waitFor(() => expect(getResumenCobranzaRequest).toHaveBeenCalledTimes(2));
  }, 15000);

  it("filtra los recordatorios de contacto desde los chips rapidos", async () => {
    renderPage();

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: /Recordatorios de contacto|Contact reminders/i,
        })
      ).toBeInTheDocument()
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Solo urgentes|Only due/i })
    );

    expect(screen.getAllByText("Client One").length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/No hay recordatorios de contacto|There are no contact reminders/i)
    ).not.toBeInTheDocument();
  });

  it("muestra el reporte por estado de seguimiento y permite filtrar promesas", async () => {
    renderPage();

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: /Reporte por estado de seguimiento|Follow-up status report/i,
        })
      ).toBeInTheDocument()
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Promesas de pago|Payment promises/i })
    );

    expect(screen.getAllByText("Client One").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Saldo asociado|Tracked balance/i).length
    ).toBeGreaterThan(0);
  });

  it("muestra vacio y error segun la respuesta del endpoint", async () => {
    getResumenCobranzaRequest.mockResolvedValueOnce({
      resumen: {
        saldo_pendiente_total: 0,
        creditos_vencidos: 0,
        creditos_parciales: 0,
        pagos_cobrados_rango: 0,
        clientes_con_saldo: 0,
      },
      buckets: {
        al_dia: { count: 0, saldo_pendiente: 0 },
        vence_1_7: { count: 0, saldo_pendiente: 0 },
        vence_8_30: { count: 0, saldo_pendiente: 0 },
        vence_31_mas: { count: 0, saldo_pendiente: 0 },
      },
      clientes: [],
      reporte: {},
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/Sin cobranza|No collections/i)).toBeInTheDocument()
    );

    getResumenCobranzaRequest.mockRejectedValueOnce({
      response: { data: { error: "Cobranza caída" } },
    });

    await userEvent.click(screen.getByRole("button", { name: /Filtrar|Filter/i }));

    await waitFor(() =>
      expect(screen.getByText(/Cobranza caída/i)).toBeInTheDocument()
    );
  }, 15000);
});
