import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getAgendaDiaRequest,
  marcarOrdenNoRealizadaAgendaRequest,
  reprogramarOrdenAgendaRequest,
} from "../../api/agenda.api";
import {
  generarOrdenDesdeProgramacionRequest,
  generarOrdenDesdeEjecucionProgramacionRequest,
} from "../../api/programaciones.api";
import { changeEstadoOrdenRequest } from "../../api/ordenes.api";
import { createCreditoRequest, createPagoRequest } from "../../api/pagos.api";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import StatCard from "../../components/common/StatCard";
import TableBase from "../../components/common/TableBase";
import { useI18n } from "../../context/i18n.context";
import { useToast } from "../../context/toast.context";
import { formatCurrency } from "../../utils/currency";
import { getTodayISO } from "../../utils/date";

const visitBadgeStyles = {
  PENDIENTE: "bg-amber-100 text-amber-700",
  GENERADA: "bg-sky-100 text-sky-700",
  REPROGRAMADA: "bg-violet-100 text-violet-700",
  CANCELADA: "bg-red-100 text-red-700",
  COMPLETADA: "bg-green-100 text-green-700",
};

const signalBadgeStyles = {
  OVERDUE: "bg-red-100 text-red-700",
  WITHOUT_VISIT: "bg-slate-100 text-slate-700",
  WITHOUT_ORDER: "bg-amber-100 text-amber-700",
  READY: "bg-sky-100 text-sky-700",
};

const QUICK_FILTERS = ["ALL", "WITHOUT_VISIT", "WITHOUT_ORDER", "WITH_ORDER", "OVERDUE"];
const PAYMENT_METHODS = ["EFECTIVO", "TRANSFERENCIA", "DEPOSITO", "CHEQUE", "TARJETA", "OTRO"];

const matchesScheduleFilter = (row, filter, isOverdue) => {
  switch (filter) {
    case "WITHOUT_VISIT":
      return !row.id_ejecucion_dia;
    case "WITHOUT_ORDER":
      return !row.id_orden_trabajo_visita;
    case "WITH_ORDER":
      return Boolean(row.id_orden_trabajo_visita);
    case "OVERDUE":
      return isOverdue;
    case "ALL":
    default:
      return true;
  }
};

const AgendaHoyPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDate = searchParams.get("fecha") || getTodayISO();
  const [fecha, setFecha] = useState(initialDate);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [quickFilter, setQuickFilter] = useState("ALL");
  const [responsableFilter, setResponsableFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [cobroOrden, setCobroOrden] = useState(null);
  const [servicioOrden, setServicioOrden] = useState(null);
  const [servicioForm, setServicioForm] = useState({
    accion: "REALIZADO",
    nueva_fecha: "",
    motivo: "",
  });
  const [reprogramacionPreview, setReprogramacionPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cobroForm, setCobroForm] = useState({
    tipo: "PAGADO",
    metodo_pago: "EFECTIVO",
    monto: "",
    referencia_pago: "",
    dias_credito: "15",
    observaciones: "",
  });

  const loadAgenda = async (targetDate = fecha) => {
    try {
      setLoading(true);
      setError("");

      const res = await getAgendaDiaRequest(targetDate);
      setData(res);
    } catch (err) {
      setError(err?.response?.data?.error || t("agenda.dailyLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const dateFromQuery = searchParams.get("fecha") || getTodayISO();
    setFecha(dateFromQuery);
    loadAgenda(dateFromQuery);
  }, [searchParams]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ fecha });
  };

  const handleGenerarOrden = async (row) => {
    try {
      setActionLoading(true);
      await generarOrdenDesdeEjecucionProgramacionRequest(row.id_ejecucion_dia);
      toast.success(t("agenda.generateOrderSuccess"));
      await loadAgenda(fecha);
    } catch (err) {
      const message = err?.response?.data?.error || t("agenda.generateOrderError");
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerarOrdenDirecta = async (row) => {
    try {
      setActionLoading(true);
      await generarOrdenDesdeProgramacionRequest(row.id_programacion);
      toast.success(t("agenda.generateOrderSuccess"));
      await loadAgenda(fecha);
    } catch (err) {
      const message = err?.response?.data?.error || t("agenda.generateOrderError");
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleIniciarOrden = async (row) => {
    try {
      setActionLoading(true);
      await changeEstadoOrdenRequest(row.id_orden_trabajo, {
        estado: "EN_PROCESO",
      });
      toast.success(t("agenda.startOrderSuccess"));
      await loadAgenda(fecha);
    } catch (err) {
      const message = err?.response?.data?.error || t("agenda.startOrderError");
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const openCobroModal = (row) => {
    setCobroOrden(row);
    setCobroForm({
      tipo: "PAGADO",
      metodo_pago: "EFECTIVO",
      monto: String(Number(row.total_orden || 0).toFixed(2)),
      referencia_pago: "",
      dias_credito: "15",
      observaciones: "",
    });
  };

  const openServicioModal = (row) => {
    setServicioOrden(row);
    setReprogramacionPreview(null);
    setServicioForm({
      accion: "REALIZADO",
      nueva_fecha: "",
      motivo: "",
    });
  };

  const normalizeScheduleOrder = (row) => ({
    ...row,
    id_orden_trabajo: row.id_orden_trabajo_visita,
    numero_orden: row.numero_orden_visita || `Orden #${row.id_orden_trabajo_visita}`,
    estado: row.estado_orden_visita || "PROGRAMADA",
    total_orden: row.total_orden_visita ?? row.precio_acordado ?? 0,
    estado_cobro: row.estado_cobro_visita || "NO_COBRADO",
  });

  const loadReprogramacionPreview = async (targetDate) => {
    if (!targetDate) {
      setReprogramacionPreview(null);
      return;
    }

    try {
      setPreviewLoading(true);
      const agenda = await getAgendaDiaRequest(targetDate);
      setReprogramacionPreview(agenda);
    } catch (_err) {
      setReprogramacionPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleServicioSubmit = async (event) => {
    event.preventDefault();

    if (!servicioOrden) return;

    try {
      setActionLoading(true);

      if (servicioForm.accion === "REALIZADO") {
        await changeEstadoOrdenRequest(servicioOrden.id_orden_trabajo, {
          estado: "COMPLETADA",
        });
        toast.success("Servicio marcado como realizado");
      }

      if (servicioForm.accion === "REPROGRAMAR") {
        await reprogramarOrdenAgendaRequest(servicioOrden.id_orden_trabajo, {
          nueva_fecha: servicioForm.nueva_fecha,
          motivo_reprogramacion: servicioForm.motivo || "Reprogramado desde agenda",
        });
        toast.success("Servicio reprogramado");
      }

      if (servicioForm.accion === "NO_REALIZADO") {
        await marcarOrdenNoRealizadaAgendaRequest(servicioOrden.id_orden_trabajo, {
          motivo: servicioForm.motivo || "Servicio no realizado desde agenda",
        });
        toast.success("Servicio marcado como no realizado");
      }

      setServicioOrden(null);
      await loadAgenda(fecha);
    } catch (err) {
      const message = err?.response?.data?.error || "No se pudo actualizar el servicio";
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCobroSubmit = async (event) => {
    event.preventDefault();

    if (!cobroOrden) return;

    try {
      setActionLoading(true);
      const monto = Number(cobroForm.monto || cobroOrden.total_orden || 0);

      if (cobroForm.tipo === "PAGADO") {
        await createPagoRequest({
          id_cliente: cobroOrden.id_cliente,
          id_orden_trabajo: cobroOrden.id_orden_trabajo,
          fecha_pago: fecha,
          metodo_pago: cobroForm.metodo_pago,
          monto,
          referencia_pago: cobroForm.referencia_pago || null,
          observaciones: cobroForm.observaciones || "Pago registrado desde agenda",
        });
        toast.success("Pago registrado");
      }

      if (cobroForm.tipo === "CREDITO") {
        const vencimiento = new Date(`${fecha}T00:00:00`);
        vencimiento.setDate(vencimiento.getDate() + Number(cobroForm.dias_credito || 0));
        await createCreditoRequest({
          id_cliente: cobroOrden.id_cliente,
          id_orden_trabajo: cobroOrden.id_orden_trabajo,
          monto_total: monto,
          monto_pagado: 0,
          dias_credito: Number(cobroForm.dias_credito || 0),
          fecha_inicio_credito: fecha,
          fecha_vencimiento: vencimiento.toISOString().slice(0, 10),
          observaciones: cobroForm.observaciones || "Credito creado desde agenda",
        });
        toast.success("Credito creado");
      }

      if (cobroForm.tipo === "NO_COBRADO") {
        toast.info("La orden queda como no cobrada");
      }

      setCobroOrden(null);
      await loadAgenda(fecha);
    } catch (err) {
      const message = err?.response?.data?.error || "No se pudo actualizar el cobro";
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const getSignalForSchedule = (row, isOverdue) => {
    if (isOverdue) return "OVERDUE";
    if (!row.id_ejecucion_dia) return "WITHOUT_VISIT";
    if (!row.id_orden_trabajo_visita) return "WITHOUT_ORDER";
    return "READY";
  };

  const programacionesColumns = useMemo(
    () => [
      {
        key: "hora_programada",
        label: t("agenda.hour"),
        render: (row) => row.hora_programada || t("agenda.noHour"),
      },
      { key: "cliente", label: t("agenda.client") },
      { key: "nombre_propiedad", label: t("agenda.property") },
      { key: "servicio", label: t("agenda.service") },
      {
        key: "empleado_responsable",
        label: t("agenda.owner"),
        render: (row) => row.empleado_responsable || "-",
      },
      { key: "frecuencia", label: t("agenda.frequency") },
      {
        key: "estado_visita_actual",
        label: t("agenda.visitStatus"),
        render: (row) =>
          row.estado_visita_actual ? (
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                visitBadgeStyles[row.estado_visita_actual] || "bg-slate-100 text-slate-700"
              }`}
            >
              {t(`schedules.visitStates.${row.estado_visita_actual}`)}
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {t("agenda.noVisitGenerated")}
            </span>
          ),
      },
      {
        key: "ultima_ejecucion_fecha",
        label: t("agenda.lastVisit"),
        render: (row) =>
          row.ultima_ejecucion_fecha
            ? `${row.ultima_ejecucion_fecha} · ${t(
                `schedules.visitStates.${row.ultima_ejecucion_estado || "SIN_VISITA"}`,
              )}`
            : "-",
      },
      { key: "prioridad", label: t("agenda.priority") },
      {
        key: "signal",
        label: t("agenda.signal"),
        render: (row) => {
          const signal = getSignalForSchedule(row, row.proxima_fecha && row.proxima_fecha < fecha);
          return (
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                signalBadgeStyles[signal] || "bg-slate-100 text-slate-700"
              }`}
            >
              {t(`agenda.signals.${signal}`)}
            </span>
          );
        },
      },
      {
        key: "precio_acordado",
        label: t("agenda.price"),
        render: (row) => formatCurrency(row.precio_acordado),
      },
    ],
    [t]
  );

  const ordenesColumns = useMemo(
    () => [
      {
        key: "hora_inicio_programada",
        label: t("agenda.hour"),
        render: (row) => row.hora_inicio_programada || t("agenda.noHour"),
      },
      { key: "numero_orden", label: t("agenda.order") },
      { key: "cliente", label: t("agenda.client") },
      { key: "nombre_propiedad", label: t("agenda.property") },
      { key: "tipo_visita", label: t("agenda.type") },
      {
        key: "tecnicos",
        label: t("agenda.assignedStaff"),
        render: (row) => row.tecnicos || "-",
      },
      { key: "estado", label: t("orders.status") },
      {
        key: "total_orden",
        label: t("agenda.total"),
        render: (row) => formatCurrency(row.total_orden),
      },
      {
        key: "estado_cobro",
        label: "Cobro",
        render: (row) => {
          const styles = {
            PAGADO: "bg-green-100 text-green-700",
            CREDITO: "bg-amber-100 text-amber-700",
            NO_COBRADO: "bg-slate-100 text-slate-700",
          };
          const labels = {
            PAGADO: "Pagado",
            CREDITO: "Credito",
            NO_COBRADO: "No cobrado",
          };
          return (
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles[row.estado_cobro] || styles.NO_COBRADO}`}>
              {labels[row.estado_cobro] || labels.NO_COBRADO}
            </span>
          );
        },
      },
    ],
    [t]
  );

  const creditosColumns = useMemo(
    () => [
      { key: "cliente", label: t("agenda.client") },
      { key: "numero_orden", label: t("agenda.order") },
      { key: "estado", label: t("credits.status") },
      {
        key: "saldo_pendiente",
        label: t("agenda.balance"),
        render: (row) => formatCurrency(row.saldo_pendiente),
      },
      { key: "fecha_vencimiento", label: t("agenda.dueDate") },
    ],
    [t]
  );

  const cobranzaColumns = useMemo(
    () => [
      { key: "cliente", label: t("agenda.client") },
      {
        key: "saldo_pendiente",
        label: t("agenda.balance"),
        render: (row) => formatCurrency(row.saldo_pendiente),
      },
      {
        key: "dias_vencido",
        label: t("collections.table.overdueDays"),
        render: (row) => row.dias_vencido || 0,
      },
      {
        key: "ultimo_seguimiento_fecha",
        label: t("agenda.collections.lastContact"),
        render: (row) =>
          row.ultimo_seguimiento_fecha
            ? `${row.ultimo_seguimiento_fecha} - ${t(
                `collections.followUp.results.${row.ultimo_seguimiento_resultado || "PENDIENTE"}`
              )}`
            : "-",
      },
      {
        key: "proximo_contacto",
        label: t("agenda.collections.nextContact"),
        render: (row) => row.proximo_contacto || "-",
      },
    ],
    [t]
  );

  const quickFilterOptions = useMemo(
    () =>
      QUICK_FILTERS.map((value) => ({
        value,
        label: t(`agenda.quickFilters.${value}`),
      })),
    [t]
  );

  const todaySchedules = data?.programaciones || [];
  const overdueSchedules = data?.programaciones_vencidas || [];
  const allSchedules = [...todaySchedules, ...overdueSchedules];
  const responsablesOptions = useMemo(() => {
    const map = new Map();
    allSchedules.forEach((row) => {
      if (row.id_empleado_responsable && row.empleado_responsable) {
        map.set(String(row.id_empleado_responsable), row.empleado_responsable);
      }
    });
    return [{ value: "ALL", label: t("agenda.allOwners") }, ...Array.from(map.entries()).map(([value, label]) => ({ value, label }))];
  }, [allSchedules, t]);

  const filteredTodaySchedules = useMemo(
    () =>
      todaySchedules.filter(
        (row) =>
          matchesScheduleFilter(row, quickFilter, false) &&
          (responsableFilter === "ALL" ||
            String(row.id_empleado_responsable || "") === responsableFilter)
      ),
    [todaySchedules, quickFilter, responsableFilter]
  );

  const filteredOverdueSchedules = useMemo(
    () =>
      overdueSchedules.filter(
        (row) =>
          matchesScheduleFilter(row, quickFilter, true) &&
          (responsableFilter === "ALL" ||
            String(row.id_empleado_responsable || "") === responsableFilter)
      ),
    [overdueSchedules, quickFilter, responsableFilter]
  );

  const complianceSummary = useMemo(
    () => ({
      pendingVisit: todaySchedules.filter((row) => row.estado_visita_actual === "PENDIENTE").length,
      withoutVisit: allSchedules.filter((row) => !row.id_ejecucion_dia).length,
      withoutOrder: allSchedules.filter((row) => !row.id_orden_trabajo_visita).length,
      withOrder: allSchedules.filter((row) => row.id_orden_trabajo_visita).length,
    }),
    [todaySchedules, allSchedules]
  );

  const renderProgramacionActions = (row) => (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => navigate(`/programaciones/${row.id_programacion}`)}
        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
      >
        {t("agenda.viewSchedule")}
      </button>

      {row.id_ejecucion_dia && row.estado_visita_actual === "PENDIENTE" && !row.id_orden_trabajo_visita ? (
        <button
          type="button"
          onClick={() => handleGenerarOrden(row)}
          disabled={actionLoading}
          className="rounded-lg border px-3 py-1.5 text-xs text-sky-700 hover:bg-sky-50 disabled:opacity-60"
        >
          {t("agenda.generateOrder")}
        </button>
      ) : null}

      {row.id_orden_trabajo_visita ? (
        <button
          type="button"
          onClick={() => navigate(`/ordenes/${row.id_orden_trabajo_visita}`)}
          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
        >
          {t("agenda.viewOrder")}
        </button>
      ) : null}

      {!row.id_orden_trabajo_visita && !row.id_ejecucion_dia ? (
        <button
          type="button"
          onClick={() => handleGenerarOrdenDirecta(row)}
          disabled={actionLoading}
          className="rounded-lg border px-3 py-1.5 text-xs text-sky-700 hover:bg-sky-50 disabled:opacity-60"
        >
          {t("agenda.generateOrder")}
        </button>
      ) : null}

      {row.id_orden_trabajo_visita ? (
        <>
          <button
            type="button"
            onClick={() => openCobroModal(normalizeScheduleOrder(row))}
            disabled={actionLoading}
            className="rounded-lg border px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            Cobrar
          </button>
          <button
            type="button"
            onClick={() => openServicioModal(normalizeScheduleOrder(row))}
            disabled={actionLoading || ["COMPLETADA", "CANCELADA"].includes(row.estado_orden_visita)}
            className="rounded-lg border px-3 py-1.5 text-xs text-violet-700 hover:bg-violet-50 disabled:opacity-60"
          >
            Servicio
          </button>
        </>
      ) : null}
    </div>
  );

  const renderOrdenActions = (row) => (
    <div className="flex flex-wrap gap-2">
      {["PENDIENTE", "PROGRAMADA"].includes(row.estado) ? (
        <button
          type="button"
          onClick={() => handleIniciarOrden(row)}
          disabled={actionLoading}
          className="rounded-lg border px-3 py-1.5 text-xs text-sky-700 hover:bg-sky-50 disabled:opacity-60"
        >
          {t("agenda.startOrder")}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => navigate(`/ordenes/${row.id_orden_trabajo}`)}
        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
      >
        {t("agenda.viewOrder")}
      </button>
      <button
        type="button"
        onClick={() => openCobroModal(row)}
        disabled={actionLoading}
        className="rounded-lg border px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
      >
        Cobrar
      </button>
      <button
        type="button"
        onClick={() => openServicioModal(row)}
        disabled={actionLoading || ["COMPLETADA", "CANCELADA"].includes(row.estado)}
        className="rounded-lg border px-3 py-1.5 text-xs text-violet-700 hover:bg-violet-50 disabled:opacity-60"
      >
        Servicio
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("agenda.todayTitle")}</h1>
          <p className="text-sm text-slate-500">{t("agenda.todaySubtitle")}</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-[minmax(0,220px)_minmax(0,220px)_auto]"
      >
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <select
          value={responsableFilter}
          onChange={(e) => setResponsableFilter(e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          {responsablesOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white"
        >
          {t("agenda.consult")}
        </button>
      </form>

      {loading && <Loader text={t("agenda.loadingToday")} />}

      {!loading && error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t("agenda.schedules")} value={data.resumen.total_programaciones} />
            <StatCard title={t("agenda.overdueSchedules")} value={data.resumen.total_programaciones_vencidas || 0} />
            <StatCard title={t("agenda.orders")} value={data.resumen.total_ordenes} />
            <StatCard title={t("agenda.dueItems")} value={data.resumen.total_vencimientos_credito} />
            <StatCard title={t("agenda.collections.summary")} value={data.resumen.total_cobranza_alertas || 0} />
          </div>

          <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{t("agenda.complianceTitle")}</h2>
                <p className="text-sm text-slate-500">{t("agenda.complianceDescription")}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title={t("agenda.pendingVisitSummary")} value={complianceSummary.pendingVisit} />
              <StatCard title={t("agenda.withoutVisitSummary")} value={complianceSummary.withoutVisit} />
              <StatCard title={t("agenda.withoutOrderSummary")} value={complianceSummary.withoutOrder} />
              <StatCard title={t("agenda.withOrderSummary")} value={complianceSummary.withOrder} />
            </div>

            <div className="flex flex-wrap gap-2">
              {quickFilterOptions.map((option) => {
                const active = quickFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setQuickFilter(option.value)}
                    className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t("agenda.scheduledServices")}</h2>
            {filteredTodaySchedules.length ? (
              <TableBase
                columns={programacionesColumns}
                data={filteredTodaySchedules}
                renderActions={renderProgramacionActions}
              />
            ) : (
              <EmptyState
                title={t("agenda.noSchedulesTitle")}
                description={t("agenda.noSchedulesDescription")}
              />
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t("agenda.overdueTitle")}</h2>
            {filteredOverdueSchedules.length ? (
              <TableBase
                columns={programacionesColumns}
                data={filteredOverdueSchedules}
                renderActions={renderProgramacionActions}
              />
            ) : (
              <EmptyState
                title={t("agenda.noOverdueTitle")}
                description={t("agenda.noOverdueDescription")}
              />
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t("agenda.workOrders")}</h2>
            {data.ordenes?.length ? (
              <TableBase columns={ordenesColumns} data={data.ordenes} renderActions={renderOrdenActions} />
            ) : (
              <EmptyState
                title={t("agenda.noOrdersTitle")}
                description={t("agenda.noOrdersDescription")}
              />
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{t("agenda.creditDueTitle")}</h2>
            {data.vencimientos_credito?.length ? (
              <TableBase columns={creditosColumns} data={data.vencimientos_credito} />
            ) : (
              <EmptyState
                title={t("agenda.noDueTitle")}
                description={t("agenda.noDueDescription")}
              />
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{t("agenda.collections.title")}</h2>
                <p className="text-sm text-slate-500">{t("agenda.collections.subtitle")}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/cobranza")}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
              >
                {t("agenda.collections.openBoard")}
              </button>
            </div>

            {data.cobranza_alertas?.length ? (
              <>
                <TableBase columns={cobranzaColumns} data={data.cobranza_alertas} />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {data.cobranza_alertas.map((item) => (
                    <article key={item.id_credito} className="rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">{item.cliente}</h3>
                          <p className="text-sm text-slate-500">
                            {item.numero_orden || t("agenda.collections.noOrder")}
                          </p>
                        </div>
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                          {t("agenda.collections.priority")}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {t("agenda.balance")}
                          </p>
                          <p className="mt-2 text-base font-semibold text-slate-900">
                            {formatCurrency(item.saldo_pendiente)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {t("collections.table.overdueDays")}
                          </p>
                          <p className="mt-2 text-base font-semibold text-slate-900">
                            {item.dias_vencido || 0}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-sm text-slate-600">
                        {item.proximo_contacto
                          ? t("agenda.collections.nextContactSummary", {
                              date: item.proximo_contacto,
                            })
                          : t("agenda.collections.noNextContact")}
                      </p>

                      {item.ultima_nota_seguimiento ? (
                        <p className="mt-2 text-sm text-slate-500">{item.ultima_nota_seguimiento}</p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/clientes/${item.id_cliente}`)}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                        >
                          {t("collections.actions.viewClient")}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate("/cobranza")}
                          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                        >
                          {t("agenda.collections.openBoard")}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                title={t("agenda.collections.emptyTitle")}
                description={t("agenda.collections.emptyDescription")}
              />
            )}
          </section>
        </>
      )}

      {cobroOrden ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <form onSubmit={handleCobroSubmit} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Cobro de orden</h2>
                <p className="text-sm text-slate-500">
                  {cobroOrden.numero_orden} - {cobroOrden.cliente}
                </p>
              </div>
              <button type="button" onClick={() => setCobroOrden(null)} className="rounded-lg border px-3 py-1 text-sm">
                Cerrar
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <select
                value={cobroForm.tipo}
                onChange={(event) => setCobroForm((prev) => ({ ...prev, tipo: event.target.value }))}
                className="rounded-xl border px-4 py-3"
              >
                <option value="PAGADO">Pagado</option>
                <option value="NO_COBRADO">No pagado / no cobrado</option>
                <option value="CREDITO">Credito para cliente</option>
              </select>

              {cobroForm.tipo !== "NO_COBRADO" ? (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cobroForm.monto}
                  onChange={(event) => setCobroForm((prev) => ({ ...prev, monto: event.target.value }))}
                  className="rounded-xl border px-4 py-3"
                  placeholder="Monto"
                />
              ) : null}

              {cobroForm.tipo === "PAGADO" ? (
                <>
                  <select
                    value={cobroForm.metodo_pago}
                    onChange={(event) => setCobroForm((prev) => ({ ...prev, metodo_pago: event.target.value }))}
                    className="rounded-xl border px-4 py-3"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                  <input
                    value={cobroForm.referencia_pago}
                    onChange={(event) => setCobroForm((prev) => ({ ...prev, referencia_pago: event.target.value }))}
                    className="rounded-xl border px-4 py-3"
                    placeholder="Referencia"
                  />
                </>
              ) : null}

              {cobroForm.tipo === "CREDITO" ? (
                <input
                  type="number"
                  min="0"
                  value={cobroForm.dias_credito}
                  onChange={(event) => setCobroForm((prev) => ({ ...prev, dias_credito: event.target.value }))}
                  className="rounded-xl border px-4 py-3"
                  placeholder="Dias de credito"
                />
              ) : null}

              <textarea
                value={cobroForm.observaciones}
                onChange={(event) => setCobroForm((prev) => ({ ...prev, observaciones: event.target.value }))}
                rows={3}
                className="rounded-xl border px-4 py-3"
                placeholder="Observaciones"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCobroOrden(null)} className="rounded-xl border px-4 py-2">
                Cancelar
              </button>
              <button disabled={actionLoading} className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60">
                Guardar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {servicioOrden ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <form onSubmit={handleServicioSubmit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Resultado del servicio</h2>
                <p className="text-sm text-slate-500">
                  {servicioOrden.numero_orden} - {servicioOrden.cliente}
                </p>
              </div>
              <button type="button" onClick={() => setServicioOrden(null)} className="rounded-lg border px-3 py-1 text-sm">
                Cerrar
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <select
                value={servicioForm.accion}
                onChange={(event) => {
                  const accion = event.target.value;
                  setServicioForm((prev) => ({ ...prev, accion }));
                  if (accion !== "REPROGRAMAR") {
                    setReprogramacionPreview(null);
                  }
                }}
                className="rounded-xl border px-4 py-3"
              >
                <option value="REALIZADO">Se realizó el servicio</option>
                <option value="REPROGRAMAR">No se realizó, reprogramar</option>
                <option value="NO_REALIZADO">No se realizó y esperar siguiente fecha</option>
              </select>

              {servicioForm.accion === "REPROGRAMAR" ? (
                <>
                  <input
                    type="date"
                    value={servicioForm.nueva_fecha}
                    onChange={(event) => {
                      const nuevaFecha = event.target.value;
                      setServicioForm((prev) => ({ ...prev, nueva_fecha: nuevaFecha }));
                      loadReprogramacionPreview(nuevaFecha);
                    }}
                    className="rounded-xl border px-4 py-3"
                  />
                  <textarea
                    value={servicioForm.motivo}
                    onChange={(event) => setServicioForm((prev) => ({ ...prev, motivo: event.target.value }))}
                    rows={3}
                    className="rounded-xl border px-4 py-3"
                    placeholder="Motivo de reprogramacion"
                  />

                  <section className="rounded-2xl border bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Carga del día seleccionado</h3>
                    {previewLoading ? (
                      <p className="mt-2 text-sm text-slate-500">Cargando agenda...</p>
                    ) : reprogramacionPreview ? (
                      <div className="mt-3 space-y-3">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div className="rounded-xl bg-white p-3">
                            <p className="text-xs text-slate-500">Programaciones</p>
                            <p className="text-lg font-semibold">{reprogramacionPreview.resumen?.total_programaciones || 0}</p>
                          </div>
                          <div className="rounded-xl bg-white p-3">
                            <p className="text-xs text-slate-500">Ordenes</p>
                            <p className="text-lg font-semibold">{reprogramacionPreview.resumen?.total_ordenes || 0}</p>
                          </div>
                          <div className="rounded-xl bg-white p-3">
                            <p className="text-xs text-slate-500">Vencidas</p>
                            <p className="text-lg font-semibold">{reprogramacionPreview.resumen?.total_programaciones_vencidas || 0}</p>
                          </div>
                        </div>

                        <div className="max-h-52 overflow-y-auto rounded-xl bg-white">
                          {[...(reprogramacionPreview.programaciones || []), ...(reprogramacionPreview.ordenes || [])].length ? (
                            [...(reprogramacionPreview.programaciones || []), ...(reprogramacionPreview.ordenes || [])].map((item, index) => (
                              <div key={`${item.id_programacion || item.id_orden_trabajo}-${index}`} className="border-b px-3 py-2 text-sm last:border-b-0">
                                <p className="font-medium text-slate-900">{item.cliente}</p>
                                <p className="text-slate-500">
                                  {item.servicio || item.numero_orden} - {item.nombre_propiedad || "Sin propiedad"} - {item.hora_programada || item.hora_inicio_programada || "Sin hora"}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="p-3 text-sm text-slate-500">No hay programaciones u ordenes para ese dia.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">Selecciona una fecha para ver la carga.</p>
                    )}
                  </section>
                </>
              ) : null}

              {servicioForm.accion === "NO_REALIZADO" ? (
                <textarea
                  value={servicioForm.motivo}
                  onChange={(event) => setServicioForm((prev) => ({ ...prev, motivo: event.target.value }))}
                  rows={3}
                  className="rounded-xl border px-4 py-3"
                  placeholder="Motivo por el que no se realizó"
                />
              ) : null}

              {servicioForm.accion === "NO_REALIZADO" ? (
                <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Se cancelará esta orden y la programación recurrente avanzará a su próxima fecha normal.
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setServicioOrden(null)} className="rounded-xl border px-4 py-2">
                Cancelar
              </button>
              <button
                disabled={
                  actionLoading ||
                  (servicioForm.accion === "REPROGRAMAR" && !servicioForm.nueva_fecha) ||
                  (["REPROGRAMAR", "NO_REALIZADO"].includes(servicioForm.accion) && !servicioForm.motivo.trim())
                }
                className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};

export default AgendaHoyPage;
