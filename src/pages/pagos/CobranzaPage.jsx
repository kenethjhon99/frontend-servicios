import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClientesRequest } from "../../api/clientes.api";
import { getUsuariosRequest } from "../../api/usuarios.api";
import {
  abrirEstadoCuentaRequest,
  abrirReciboAbonoRequest,
} from "../../api/documentos.api";
import {
  aplicarPagoCreditoRequest,
  createSeguimientoCobranzaRequest,
  getResumenCobranzaRequest,
} from "../../api/pagos.api";
import AlertMessage from "../../components/common/AlertMessage";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import PdfButtonGroup from "../../components/common/PdfButtonGroup";
import StatCard from "../../components/common/StatCard";
import TableBase from "../../components/common/TableBase";
import { useAuth } from "../../context/auth.context";
import { useI18n } from "../../context/i18n.context";
import { useToast } from "../../context/toast.context";
import { extractApiError } from "../../lib/api";
import { formatCurrency } from "../../utils/currency";
import { downloadCobranzaCsv } from "../../utils/csv";
import { addDaysISO, getTodayISO } from "../../utils/date";
import CreditoAbonoModal from "./components/CreditoAbonoModal";
import CobranzaFilters from "./components/CobranzaFilters";
import CobranzaSeguimientoModal from "./components/CobranzaSeguimientoModal";
import {
  FOLLOW_UP_REPORT_FILTERS,
  REMINDER_FILTERS,
  useCobranzaInsights,
} from "./hooks/useCobranzaInsights";

const creditStatusClasses = {
  PENDIENTE: "bg-amber-100 text-amber-700",
  PARCIAL: "bg-sky-100 text-sky-700",
  VENCIDO: "bg-red-100 text-red-700",
  PAGADO: "bg-green-100 text-green-700",
  CANCELADO: "bg-slate-200 text-slate-700",
};

const createInitialFilters = () => {
  const today = getTodayISO();

  return {
    fecha_desde: addDaysISO(today, -29),
    fecha_hasta: today,
    estado: "",
    id_cliente: "",
    solo_vencidos: false,
    solo_parciales: false,
  };
};

const initialAbono = {
  metodo_pago: "EFECTIVO",
  monto: "",
  referencia_pago: "",
  observaciones: "",
};

const createInitialSeguimientoForm = () => ({
  medio_contacto: "LLAMADA",
  resultado: "PENDIENTE",
  fecha_seguimiento: getTodayISO(),
  proximo_contacto: "",
  notas: "",
  id_usuario_responsable: "",
});

const bucketConfig = [
  { key: "al_dia", titleKey: "collections.buckets.current" },
  { key: "vence_1_7", titleKey: "collections.buckets.range1to7" },
  { key: "vence_8_30", titleKey: "collections.buckets.range8to30" },
  { key: "vence_31_mas", titleKey: "collections.buckets.range31Plus" },
];

const clientSignalStyles = {
  ATTENTION: "bg-red-100 text-red-700",
  FOLLOW_UP: "bg-amber-100 text-amber-700",
  CONTROLLED: "bg-green-100 text-green-700",
};

const collectionAlertStyles = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-sky-100 text-sky-700",
};

const reminderBadgeStyles = {
  DUE: "bg-red-100 text-red-700",
  UPCOMING: "bg-amber-100 text-amber-700",
  MISSING: "bg-slate-200 text-slate-700",
  CONTROLLED: "bg-green-100 text-green-700",
};

const CobranzaPage = () => {
  const auth = useAuth();
  const { t, locale } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();

  const [filters, setFilters] = useState(createInitialFilters);
  const [clientes, setClientes] = useState([]);
  const [seguimientoResponsables, setSeguimientoResponsables] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [ultimoAbonoId, setUltimoAbonoId] = useState(null);
  const [abonoTarget, setAbonoTarget] = useState(null);
  const [abonoForm, setAbonoForm] = useState(initialAbono);
  const [seguimientoTarget, setSeguimientoTarget] = useState(null);
  const [seguimientoForm, setSeguimientoForm] = useState(createInitialSeguimientoForm);
  const [reminderFilter, setReminderFilter] = useState("ALL");
  const [followUpReportFilter, setFollowUpReportFilter] = useState("ALL");
  const currentUserId = String(auth?.user?.id_usuario || "");

  const resolveDefaultResponsable = (target, responsables = seguimientoResponsables) => {
    if (target?.id_usuario_responsable) {
      return String(target.id_usuario_responsable);
    }

    const currentUser = responsables.find(
      (usuario) => String(usuario.id_usuario) === currentUserId
    );
    if (currentUser) {
      return String(currentUser.id_usuario);
    }

    return responsables[0] ? String(responsables[0].id_usuario) : "";
  };

  const loadCobranza = async (activeFilters = filters) => {
    try {
      setLoading(true);
      setError("");
      const response = await getResumenCobranzaRequest(activeFilters);
      setData(response);
    } catch (requestError) {
      setError(extractApiError(requestError, t("collections.loadError")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadBase = async () => {
      try {
        setLoading(true);
        const [clientesRes, usuariosRes, cobranzaRes] = await Promise.all([
          getClientesRequest({ limit: 300 }),
          getUsuariosRequest({ limit: 300 }),
          getResumenCobranzaRequest(filters),
        ]);
        setClientes(clientesRes.data || []);
        setSeguimientoResponsables(
          (usuariosRes.data || []).filter(
            (usuario) =>
              usuario.estado === "ACTIVO" &&
              ["ADMIN", "SUPERVISOR", "COBRADOR"].includes(usuario.rol)
          )
        );
        setData(cobranzaRes);
        setError("");
      } catch (requestError) {
        setError(extractApiError(requestError, t("collections.loadError")));
      } finally {
        setLoading(false);
      }
    };

    loadBase();
  }, []);

  const handleFilterChange = (event) => {
    const { name, value, type, checked } = event.target;
    setError("");
    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await loadCobranza(filters);
  };

  const handleReset = async () => {
    const next = createInitialFilters();
    setFilters(next);
    await loadCobranza(next);
  };

  const handleAbonoChange = (event) => {
    const { name, value } = event.target;
    setError("");
    setAbonoForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSeguimientoChange = (event) => {
    const { name, value } = event.target;
    setError("");
    setSeguimientoForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const closeAbonoModal = () => {
    setError("");
    setAbonoTarget(null);
    setAbonoForm(initialAbono);
  };

  const closeSeguimientoModal = () => {
    setError("");
    setSeguimientoTarget(null);
    setSeguimientoForm(createInitialSeguimientoForm());
  };

  const handleOpenAbono = (credito) => {
    setError("");
    setAbonoTarget(credito);
    setAbonoForm({
      ...initialAbono,
      monto: credito.saldo_pendiente ? String(credito.saldo_pendiente) : "",
    });
  };

  const handleOpenSeguimiento = (target) => {
    setError("");
    setSeguimientoTarget(target);
    setSeguimientoForm((prev) => ({
      ...createInitialSeguimientoForm(),
      proximo_contacto: target?.proximo_contacto || "",
      notas: target?.ultima_nota_seguimiento || prev.notas,
      id_usuario_responsable: resolveDefaultResponsable(target),
    }));
  };

  const handleSubmitAbono = async () => {
    if (!abonoTarget) return;

    const monto = Number(abonoForm.monto);
    const saldoPendiente = Number(abonoTarget.saldo_pendiente);

    if (!monto || monto <= 0) {
      setError(t("credits.paymentAmountInvalid"));
      return;
    }

    if (monto > saldoPendiente) {
      setError(t("credits.paymentAmountExceeds"));
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const respuesta = await aplicarPagoCreditoRequest({
        id_credito: abonoTarget.id_credito,
        metodo_pago: abonoForm.metodo_pago,
        monto,
        referencia_pago: abonoForm.referencia_pago || null,
        observaciones: abonoForm.observaciones || null,
      });

      setUltimoAbonoId(respuesta?.id_pago_credito || null);
      closeAbonoModal();
      await loadCobranza(filters);
      toast.success(t("collections.paymentApplied"));
    } catch (requestError) {
      const message = extractApiError(requestError, t("credits.paymentApplyError"));
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitSeguimiento = async () => {
    if (!seguimientoTarget) return;

    if (!seguimientoForm.notas.trim()) {
      setError(t("collections.followUp.notesRequired"));
      return;
    }

    if (!seguimientoForm.id_usuario_responsable) {
      setError(t("collections.followUp.ownerRequired"));
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      await createSeguimientoCobranzaRequest({
        id_cliente: seguimientoTarget.id_cliente,
        id_credito: seguimientoTarget.credito_principal?.id_credito || seguimientoTarget.id_credito,
        fecha_seguimiento: seguimientoForm.fecha_seguimiento || undefined,
        medio_contacto: seguimientoForm.medio_contacto,
        resultado: seguimientoForm.resultado,
        proximo_contacto: seguimientoForm.proximo_contacto || null,
        notas: seguimientoForm.notas,
        id_usuario_responsable: Number(seguimientoForm.id_usuario_responsable),
      });
      closeSeguimientoModal();
      await loadCobranza(filters);
      toast.success(t("collections.followUp.saved"));
    } catch (requestError) {
      const message = extractApiError(requestError, t("collections.followUp.saveError"));
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEstadoCuenta = async (row) => {
    try {
      await abrirEstadoCuentaRequest(row.id_cliente, {
        desde: filters.fecha_desde || undefined,
        hasta: filters.fecha_hasta || undefined,
      });
    } catch (requestError) {
      const message = extractApiError(requestError, t("collections.statementError"));
      setError(message);
      toast.error(message);
    }
  };

  const handleExportCsv = () => {
    try {
      downloadCobranzaCsv({
        filters,
        resumen: data?.resumen,
        buckets: data?.buckets,
        clientes: data?.clientes || [],
        followUpStatusSummary,
        followUpReportRows,
      });
      toast.success(t("collections.exportSuccess"));
    } catch {
      toast.error(t("collections.exportError"));
    }
  };

  const handlePrint = () => {
    window.print?.();
  };

  const columns = useMemo(
    () => [
      { key: "cliente", label: t("collections.table.client") },
      {
        key: "numero_orden",
        label: t("collections.table.order"),
        render: (row) => row.numero_orden || "-",
      },
      {
        key: "estado",
        label: t("collections.table.status"),
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              creditStatusClasses[row.estado] || "bg-slate-100 text-slate-700"
            }`}
          >
            {row.estado}
          </span>
        ),
      },
      { key: "fecha_vencimiento", label: t("collections.table.dueDate") },
      {
        key: "saldo_pendiente",
        label: t("collections.table.balance"),
        render: (row) => formatCurrency(row.saldo_pendiente),
      },
      {
        key: "monto_pagado",
        label: t("collections.table.paid"),
        render: (row) => formatCurrency(row.monto_pagado),
      },
      {
        key: "dias_vencido",
        label: t("collections.table.overdueDays"),
        render: (row) => row.dias_vencido || 0,
      },
      {
        key: "ultimo_pago",
        label: t("collections.table.lastPayment"),
        render: (row) =>
          row.ultimo_pago_fecha
            ? `${row.ultimo_pago_fecha} - ${formatCurrency(row.ultimo_pago_monto || 0)}`
            : "-",
      },
    ],
    [t]
  );

  const bucketCards = useMemo(
    () =>
      bucketConfig.map(({ key, titleKey }) => ({
        key,
        title: t(titleKey),
        count: data?.buckets?.[key]?.count || 0,
        balance: formatCurrency(data?.buckets?.[key]?.saldo_pendiente || 0),
      })),
    [data, t]
  );

  const selectedClientLabel =
    clientes.find((cliente) => String(cliente.id_cliente) === String(filters.id_cliente))
      ?.nombre_completo || t("collections.allClients");

  const hasRows = (data?.clientes || []).length > 0;

  const {
    groupedClients,
    reminderSummary,
    reminderCards,
    collectionFocus,
    followUpStatusSummary,
    followUpReportRows,
    priorityAlerts,
  } = useCobranzaInsights({
    clientes: data?.clientes || [],
    reminderFilter,
    followUpReportFilter,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between print-hidden">
        <div>
          <h1 className="text-2xl font-bold">{t("collections.title")}</h1>
          <p className="text-sm text-slate-500">{t("collections.subtitle")}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {t("collections.exportCsv")}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {t("collections.printReport")}
          </button>
        </div>
      </div>

      <section className="print-only rounded-2xl border bg-white p-5">
        <h1 className="text-2xl font-bold text-slate-900">{t("collections.reportTitle")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("collections.reportSubtitle")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("collections.reportRange")}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {filters.fecha_desde} - {filters.fecha_hasta}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("collections.reportClient")}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">{selectedClientLabel}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("collections.reportState")}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {filters.estado || t("collections.allStatuses")}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("collections.reportIssued")}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {new Date().toLocaleString(locale === "en" ? "en-US" : "es-GT")}
            </p>
          </div>
        </div>
      </section>

      <AlertMessage message={error} />

      {ultimoAbonoId ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 md:flex-row md:items-center md:justify-between print-hidden">
          <span>{t("credits.paymentBanner")}</span>
          <div className="flex items-center gap-2">
            <PdfButtonGroup
              label={t("payments.receipt")}
              onDownload={(opts) => abrirReciboAbonoRequest(ultimoAbonoId, opts)}
            />
            <button
              type="button"
              onClick={() => setUltimoAbonoId(null)}
              className="rounded-lg px-3 py-1.5 text-xs text-green-700 hover:bg-green-100"
            >
              {t("credits.hide")}
            </button>
          </div>
        </div>
      ) : null}

      <CobranzaFilters
        filters={filters}
        clientes={clientes}
        t={t}
        onSubmit={handleSubmit}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      {loading ? <Loader text={t("collections.loading")} /> : null}

      {!loading && data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title={t("collections.summary.outstandingBalance")}
              value={formatCurrency(data.resumen?.saldo_pendiente_total || 0)}
            />
            <StatCard
              title={t("collections.summary.overdueCredits")}
              value={data.resumen?.creditos_vencidos || 0}
            />
            <StatCard
              title={t("collections.summary.partialCredits")}
              value={data.resumen?.creditos_parciales || 0}
            />
            <StatCard
              title={t("collections.summary.collectedRange")}
              value={formatCurrency(data.resumen?.pagos_cobrados_rango || 0)}
            />
            <StatCard
              title={t("collections.summary.clientsWithBalance")}
              value={data.resumen?.clientes_con_saldo || 0}
            />
          </div>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">{t("collections.buckets.title")}</h2>
              <p className="text-sm text-slate-500">{t("collections.buckets.subtitle")}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {bucketCards.map((bucket) => (
                <article key={bucket.key} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {bucket.title}
                  </p>
                  <p className="mt-3 text-3xl font-bold text-slate-900">{bucket.count}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {t("collections.bucketBalance", { value: bucket.balance })}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">{t("collections.focus.title")}</h2>
              <p className="text-sm text-slate-500">{t("collections.focus.subtitle")}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t("collections.focus.highestRisk")}
                </p>
                {collectionFocus.highestRiskClient ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-lg font-semibold text-slate-900">
                      {collectionFocus.highestRiskClient.cliente}
                    </p>
                    <p className="text-sm text-slate-600">
                      {t("collections.focus.overdueDaysLabel", {
                        value: collectionFocus.highestRiskClient.max_dias_vencido,
                      })}
                    </p>
                    <p className="text-sm text-slate-600">
                      {t("collections.focus.balanceLabel", {
                        value: formatCurrency(
                          collectionFocus.highestRiskClient.saldo_pendiente_total
                        ),
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">{t("collections.focus.noFocus")}</p>
                )}
              </article>

              <article className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t("collections.focus.topBalance")}
                </p>
                {collectionFocus.topBalanceClient ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-lg font-semibold text-slate-900">
                      {collectionFocus.topBalanceClient.cliente}
                    </p>
                    <p className="text-sm text-slate-600">
                      {t("collections.focus.balanceLabel", {
                        value: formatCurrency(
                          collectionFocus.topBalanceClient.saldo_pendiente_total
                        ),
                      })}
                    </p>
                    <p className="text-sm text-slate-600">
                      {t("collections.focus.creditCountLabel", {
                        value: collectionFocus.topBalanceClient.total_creditos,
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">{t("collections.focus.noFocus")}</p>
                )}
              </article>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{t("collections.reminders.title")}</h2>
                <p className="text-sm text-slate-500">{t("collections.reminders.subtitle")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {REMINDER_FILTERS.map((value) => {
                  const active = reminderFilter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReminderFilter(value)}
                      className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {t(`collections.reminders.filters.${value}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <StatCard title={t("collections.reminders.summaryDue")} value={reminderSummary.due} />
              <StatCard title={t("collections.reminders.summaryUpcoming")} value={reminderSummary.upcoming} />
              <StatCard title={t("collections.reminders.summaryMissing")} value={reminderSummary.missing} />
            </div>

            {reminderCards.length ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {reminderCards.map((client) => (
                  <article key={`reminder-${client.id_cliente}`} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{client.cliente}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {t("collections.focus.balanceLabel", {
                            value: formatCurrency(client.saldo_pendiente_total),
                          })}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          reminderBadgeStyles[client.reminderStatus] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t(`collections.reminders.status.${client.reminderStatus}`)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {t("collections.reminders.nextContact")}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {client.proximo_contacto || t("collections.reminders.noNextContact")}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {t("collections.reminders.lastResult")}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {client.ultimo_seguimiento_resultado
                            ? t(`collections.followUp.results.${client.ultimo_seguimiento_resultado}`)
                            : "-"}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      {t("collections.followUp.ownerLine", {
                        owner:
                          client.usuario_responsable || t("collections.followUp.unassignedOwner"),
                      })}
                    </p>

                    {client.ultima_nota_seguimiento ? (
                      <p className="mt-4 text-sm text-slate-600">{client.ultima_nota_seguimiento}</p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenSeguimiento(client)}
                        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                      >
                        {t("collections.actions.followUp")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEstadoCuenta(client)}
                        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                      >
                        {t("collections.actions.statement")}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/clientes/${client.id_cliente}`)}
                        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                      >
                        {t("collections.actions.viewClient")}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">{t("collections.reminders.empty")}</p>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{t("collections.followUpReport.title")}</h2>
                <p className="text-sm text-slate-500">{t("collections.followUpReport.subtitle")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {FOLLOW_UP_REPORT_FILTERS.map((value) => {
                  const active = followUpReportFilter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFollowUpReportFilter(value)}
                      className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {t(`collections.followUpReport.filters.${value}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {["PROMESA_PAGO", "SIN_RESPUESTA", "REAGENDADO", "SIN_SEGUIMIENTO"].map((key) => (
                <article key={key} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t(`collections.followUp.results.${key}`)}
                  </p>
                  <p className="mt-3 text-3xl font-bold text-slate-900">
                    {followUpStatusSummary[key]?.count || 0}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {t("collections.followUpReport.balanceSummary", {
                      value: formatCurrency(followUpStatusSummary[key]?.balance || 0),
                    })}
                  </p>
                </article>
              ))}
            </div>

            {followUpReportRows.length ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {followUpReportRows.slice(0, 8).map((client) => (
                  <article key={`follow-up-${client.id_cliente}`} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{client.cliente}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {t("collections.followUpReport.statusLine", {
                            status: t(
                              `collections.followUp.results.${
                                client.ultimo_seguimiento_resultado || "SIN_SEGUIMIENTO"
                              }`
                            ),
                          })}
                        </p>
                      </div>
                      <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                        {client.max_dias_vencido}d
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {t("collections.clients.metrics.balance")}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {formatCurrency(client.saldo_pendiente_total)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {t("collections.reminders.nextContact")}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {client.proximo_contacto || t("collections.reminders.noNextContact")}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      {t("collections.followUp.ownerLine", {
                        owner:
                          client.usuario_responsable || t("collections.followUp.unassignedOwner"),
                      })}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenSeguimiento(client)}
                        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                      >
                        {t("collections.actions.followUp")}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/clientes/${client.id_cliente}`)}
                        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                      >
                        {t("collections.actions.viewClient")}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">{t("collections.followUpReport.empty")}</p>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">{t("collections.alerts.title")}</h2>
              <p className="text-sm text-slate-500">{t("collections.alerts.subtitle")}</p>
            </div>

            {priorityAlerts.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {priorityAlerts.map((alert) => (
                  <article key={`alert-${alert.id_cliente}`} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{alert.cliente}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {t(`collections.alerts.reasons.${alert.reason}`)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          collectionAlertStyles[alert.severity] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t(`collections.alerts.severity.${alert.severity}`)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {t("collections.clients.metrics.balance")}
                        </p>
                        <p className="mt-2 text-base font-semibold text-slate-900">
                          {formatCurrency(alert.saldo_pendiente_total)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {t("collections.clients.metrics.maxOverdueDays")}
                        </p>
                        <p className="mt-2 text-base font-semibold text-slate-900">
                          {alert.max_dias_vencido}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {t("collections.clients.metrics.overdue")}
                        </p>
                        <p className="mt-2 text-base font-semibold text-slate-900">
                          {alert.creditos_vencidos}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-slate-600">
                      {t(`collections.alerts.nextActions.${alert.recommendation}`)}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEstadoCuenta(alert)}
                        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                      >
                        {t("collections.actions.statement")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAbono(alert.credito_principal)}
                        className="rounded-lg border px-3 py-1.5 text-xs text-sky-700 hover:bg-sky-50"
                      >
                        {t("collections.actions.partialPayment")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenSeguimiento(alert)}
                        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                      >
                        {t("collections.actions.followUp")}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t("collections.alerts.empty")}</p>
            )}
          </section>

          {!hasRows ? (
            <EmptyState
              title={t("collections.emptyTitle")}
              description={t("collections.emptyDescription")}
            />
          ) : (
            <>
              <section className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
                <div>
                  <h2 className="text-xl font-semibold">{t("collections.clients.title")}</h2>
                  <p className="text-sm text-slate-500">{t("collections.clients.subtitle")}</p>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {groupedClients.map((client) => (
                    <article key={client.id_cliente} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">
                            {client.cliente}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {t("collections.clients.creditCount", {
                              count: client.total_creditos,
                            })}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            clientSignalStyles[client.signal] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {t(`collections.clients.signals.${client.signal}`)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl bg-white px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {t("collections.clients.metrics.balance")}
                          </p>
                          <p className="mt-2 text-base font-semibold text-slate-900">
                            {formatCurrency(client.saldo_pendiente_total)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {t("collections.clients.metrics.overdue")}
                          </p>
                          <p className="mt-2 text-base font-semibold text-slate-900">
                            {client.creditos_vencidos}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {t("collections.clients.metrics.maxOverdueDays")}
                          </p>
                          <p className="mt-2 text-base font-semibold text-slate-900">
                            {client.max_dias_vencido}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {t("collections.clients.metrics.lastPayment")}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {client.ultimo_pago_fecha
                              ? `${client.ultimo_pago_fecha} - ${formatCurrency(
                                  client.ultimo_pago_monto || 0
                                )}`
                              : "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-xl bg-white px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {t("collections.clients.followUp.lastMovement")}
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {client.ultimo_seguimiento_fecha
                              ? t("collections.clients.followUp.lastContactSummary", {
                                  date: client.ultimo_seguimiento_fecha,
                                  result: t(
                                    `collections.followUp.results.${client.ultimo_seguimiento_resultado || "PENDIENTE"}`
                                  ),
                                })
                              : client.ultimo_pago_fecha
                                ? t("collections.clients.followUp.lastPaymentSummary", {
                                    date: client.ultimo_pago_fecha,
                                    value: formatCurrency(client.ultimo_pago_monto || 0),
                                  })
                                : t("collections.clients.followUp.noPayments")}
                          </p>
                          {client.ultima_nota_seguimiento ? (
                            <p className="mt-2 text-xs text-slate-500">
                              {client.ultima_nota_seguimiento}
                            </p>
                          ) : null}
                        </div>
                        <div className="rounded-xl bg-white px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {t("collections.clients.followUp.nextAction")}
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {t(`collections.alerts.nextActions.${client.recommendation}`)}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            {client.proximo_contacto
                              ? t("collections.clients.followUp.nextContactSummary", {
                                  date: client.proximo_contacto,
                                })
                              : t("collections.clients.followUp.noNextContact")}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            {t("collections.followUp.ownerLine", {
                              owner:
                                client.usuario_responsable ||
                                t("collections.followUp.unassignedOwner"),
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEstadoCuenta(client)}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                        >
                          {t("collections.actions.statement")}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/clientes/${client.id_cliente}`)}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                        >
                          {t("collections.actions.viewClient")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAbono(client.credito_principal)}
                          className="rounded-lg border px-3 py-1.5 text-xs text-sky-700 hover:bg-sky-50"
                        >
                          {t("collections.actions.partialPayment")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenSeguimiento(client)}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                        >
                          {t("collections.actions.followUp")}
                        </button>
                        {client.credito_principal?.id_orden_trabajo ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/ordenes/${client.credito_principal.id_orden_trabajo}`)
                            }
                            className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                          >
                            {t("collections.actions.viewOrder")}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="print-hidden space-y-3">
                <div>
                  <h2 className="text-xl font-semibold">{t("collections.table.title")}</h2>
                  <p className="text-sm text-slate-500">{t("collections.table.subtitle")}</p>
                </div>

                <TableBase
                  columns={columns}
                  data={data.clientes}
                  renderActions={(row) => (
                    <div className="flex flex-wrap gap-2 print-hidden">
                      <button
                        type="button"
                        onClick={() => handleOpenEstadoCuenta(row)}
                        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                      >
                        {t("collections.actions.statement")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAbono(row)}
                        className="rounded-lg border px-3 py-1.5 text-xs text-sky-700 hover:bg-sky-50"
                      >
                        {t("collections.actions.partialPayment")}
                      </button>
                      {row.id_orden_trabajo ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/ordenes/${row.id_orden_trabajo}`)}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                        >
                          {t("collections.actions.viewOrder")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => navigate(`/clientes/${row.id_cliente}`)}
                        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                      >
                        {t("collections.actions.viewClient")}
                      </button>
                    </div>
                  )}
                />
              </section>

              <section className="print-only rounded-2xl border bg-white p-5">
                <h2 className="text-xl font-semibold">{t("collections.table.printTitle")}</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-3 py-2 text-left">{t("collections.table.client")}</th>
                        <th className="px-3 py-2 text-left">{t("collections.table.order")}</th>
                        <th className="px-3 py-2 text-left">{t("collections.table.status")}</th>
                        <th className="px-3 py-2 text-left">{t("collections.table.dueDate")}</th>
                        <th className="px-3 py-2 text-left">{t("collections.table.balance")}</th>
                        <th className="px-3 py-2 text-left">{t("collections.table.paid")}</th>
                        <th className="px-3 py-2 text-left">{t("collections.table.overdueDays")}</th>
                        <th className="px-3 py-2 text-left">{t("collections.table.lastPayment")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.clientes.map((row) => (
                        <tr key={row.id_credito} className="border-b">
                          <td className="px-3 py-2">{row.cliente}</td>
                          <td className="px-3 py-2">{row.numero_orden || "-"}</td>
                          <td className="px-3 py-2">{row.estado}</td>
                          <td className="px-3 py-2">{row.fecha_vencimiento}</td>
                          <td className="px-3 py-2">{formatCurrency(row.saldo_pendiente)}</td>
                          <td className="px-3 py-2">{formatCurrency(row.monto_pagado)}</td>
                          <td className="px-3 py-2">{row.dias_vencido || 0}</td>
                          <td className="px-3 py-2">
                            {row.ultimo_pago_fecha
                              ? `${row.ultimo_pago_fecha} - ${formatCurrency(
                                  row.ultimo_pago_monto || 0
                                )}`
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      ) : null}

      <CreditoAbonoModal
        credito={abonoTarget}
        form={abonoForm}
        error={error}
        loading={actionLoading}
        onChange={handleAbonoChange}
        onClose={closeAbonoModal}
        onSubmit={handleSubmitAbono}
      />

      <CobranzaSeguimientoModal
        target={seguimientoTarget}
        form={seguimientoForm}
        responsables={seguimientoResponsables}
        error={error}
        loading={actionLoading}
        onChange={handleSeguimientoChange}
        onClose={closeSeguimientoModal}
        onSubmit={handleSubmitSeguimiento}
      />
    </div>
  );
};

export default CobranzaPage;
