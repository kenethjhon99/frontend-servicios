import { beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("../../src/api/alertas.api", () => ({
  dashboardBaseRequest: vi.fn(),
}));

const toastApi = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock("../../src/context/toast.context", () => ({
  useToast: () => toastApi,
}));

import { dashboardBaseRequest } from "../../src/api/alertas.api";
import DashboardPage from "../../src/pages/dashboard/DashboardPage";

describe("DashboardPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    navigateMock.mockReset();
    dashboardBaseRequest.mockReset();
    toastApi.success.mockReset();
    toastApi.error.mockReset();
    toastApi.info.mockReset();
    toastApi.warning.mockReset();
    dashboardBaseRequest.mockResolvedValue({
      periodo: {
        fecha_desde: "2026-04-01",
        fecha_hasta: "2026-04-07",
      },
      resumen: {
        servicios_hoy: 2,
        servicios_manana: 1,
        servicios_atrasados: 0,
        creditos_vencidos: 0,
        pagos_hoy: 100,
        ingresos_mes: 450,
        clientes_activos: 5,
        alertas_no_leidas: 1,
      },
      serie_diaria: [
        { fecha: "2026-04-01", servicios_programados: 1, pagos_cobrados: 25, alertas_creadas: 0 },
        { fecha: "2026-04-02", servicios_programados: 2, pagos_cobrados: 50, alertas_creadas: 1 },
      ],
      totales_periodo: {
        servicios_programados: 3,
        pagos_cobrados: 75,
        alertas_creadas: 1,
      },
      cobranza_foco: {
        total_clientes_prioritarios: 1,
        saldo_prioritario_total: 620,
        creditos_vencidos_total: 2,
        seguimiento_resumen: {
          promesas_pago: 1,
          sin_respuesta: 2,
          sin_seguimiento: 1,
          contactos_vencidos: 3,
        },
        responsable_principal: {
          id_usuario: 3,
          usuario_responsable: "Collector One",
          clientes: 2,
          saldo_pendiente_total: 620,
        },
        clientes_prioritarios: [
          {
            id_cliente: 7,
            cliente: "Cliente Riesgo",
            creditos_vencidos: 2,
            saldo_pendiente_total: 620,
            max_dias_vencido: 18,
            ultimo_pago_fecha: "2026-03-28",
          },
        ],
      },
      ultimas_alertas: [],
    });
  });

  it("renderiza dashboard y muestra el foco de cobranza", async () => {
    window.localStorage.setItem(
      "svc-maint:draft:guest:programacion-form-new",
      JSON.stringify({
        savedAt: new Date().toISOString(),
        values: {
          step: 2,
          form: {
            proxima_fecha: "2026-05-10",
          },
        },
      })
    );

    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Dashboard operativo/i })).toBeInTheDocument()
    );

    await waitFor(() => expect(screen.getByLabelText(/Fecha desde/i)).toBeInTheDocument());

    expect(dashboardBaseRequest).toHaveBeenCalledWith({
      fecha_desde: expect.any(String),
      fecha_hasta: expect.any(String),
    });

    expect(screen.getByText(/Servicios del rango seleccionado/i)).toBeInTheDocument();
    expect(screen.getByText(/Borradores activos/i)).toBeInTheDocument();
    expect(screen.getByText(/Programacion/i)).toBeInTheDocument();
    expect(screen.getByText(/Cliente Riesgo/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Collector One/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Abrir cobranza|Open collections board/i })).toBeInTheDocument();
  }, 15000);

  it("aplica el preset de hoy", async () => {
    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Dashboard operativo/i })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /^Hoy$/i }));

    await waitFor(() =>
      expect(dashboardBaseRequest).toHaveBeenLastCalledWith({
        fecha_desde: expect.any(String),
        fecha_hasta: expect.any(String),
      })
    );
    expect(toastApi.info).toHaveBeenCalled();
  });

  it("permite abrir cobranza y el cliente de riesgo desde el dashboard", async () => {
    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Abrir cobranza|Open collections board/i })).toBeInTheDocument()
    );

    await userEvent.click(
      screen.getByRole("button", { name: /Abrir cobranza|Open collections board/i })
    );
    expect(navigateMock).toHaveBeenCalledWith("/cobranza");

    await userEvent.click(screen.getByRole("button", { name: /Abrir cliente|Open client/i }));
    expect(navigateMock).toHaveBeenCalledWith("/clientes/7");
  });
});
