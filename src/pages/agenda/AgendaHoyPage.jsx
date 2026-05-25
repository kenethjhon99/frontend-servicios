import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAgendaDiaRequest } from "../../api/agenda.api";
import {
  generarEjecucionProgramacionRequest,
  generarOrdenDesdeEjecucionProgramacionRequest,
} from "../../api/programaciones.api";
import { changeEstadoOrdenRequest } from "../../api/ordenes.api";
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

  const handleGenerarVisita = async (row) => {
    try {
      setActionLoading(true);
      await generarEjecucionProgramacionRequest(row.id_programacion);
      toast.success(t("agenda.generateVisitSuccess"));
      await loadAgenda(fecha);
    } catch (err) {
      const message = err?.response?.data?.error || t("agenda.generateVisitError");
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
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

      {!row.id_ejecucion_dia ? (
        <button
          type="button"
          onClick={() => handleGenerarVisita(row)}
          disabled={actionLoading}
          className="rounded-lg border px-3 py-1.5 text-xs text-sky-700 hover:bg-sky-50 disabled:opacity-60"
        >
          {t("agenda.generateVisit")}
        </button>
      ) : null}

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
    </div>
  );
};

export default AgendaHoyPage;
