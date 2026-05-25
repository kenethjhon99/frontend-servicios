import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAgendaRangoRequest } from "../../api/agenda.api";
import {
  generarEjecucionProgramacionRequest,
  generarOrdenDesdeEjecucionProgramacionRequest,
} from "../../api/programaciones.api";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import StatCard from "../../components/common/StatCard";
import { useI18n } from "../../context/i18n.context";
import { useToast } from "../../context/toast.context";
import { downloadAgendaSemanalCsv } from "../../utils/csv";
import { buildDateRange, getCurrentWeekRange } from "../../utils/date";

const visitBadgeStyles = {
  PENDIENTE: "bg-amber-100 text-amber-700",
  GENERADA: "bg-sky-100 text-sky-700",
  REPROGRAMADA: "bg-violet-100 text-violet-700",
  CANCELADA: "bg-red-100 text-red-700",
  COMPLETADA: "bg-green-100 text-green-700",
};

const orderBadgeStyles = {
  PENDIENTE: "bg-amber-100 text-amber-700",
  PROGRAMADA: "bg-sky-100 text-sky-700",
  EN_PROCESO: "bg-indigo-100 text-indigo-700",
  COMPLETADA: "bg-green-100 text-green-700",
  CANCELADA: "bg-red-100 text-red-700",
};

const daySignalStyles = {
  NEEDS_VISIT: "bg-slate-100 text-slate-700",
  NEEDS_ORDER: "bg-amber-100 text-amber-700",
  WITH_ORDERS: "bg-sky-100 text-sky-700",
  ON_TRACK: "bg-green-100 text-green-700",
  QUIET: "bg-slate-100 text-slate-500",
};

const ownerSignalStyles = {
  ATTENTION: "bg-red-100 text-red-700",
  FOLLOW_UP: "bg-amber-100 text-amber-700",
  CONTROLLED: "bg-green-100 text-green-700",
};

const WEEK_FILTERS = ["ALL", "ACTION_NEEDED", "WITHOUT_ORDER", "WITH_ORDERS"];

const formatDayLabel = (dateString, locale) => {
  const value = new Date(`${dateString}T00:00:00`);
  const targetLocale = locale === "en" ? "en-US" : "es-GT";

  return value.toLocaleDateString(targetLocale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
};

const AgendaSemanalPage = () => {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const initialRange = getCurrentWeekRange();

  const [filters, setFilters] = useState(initialRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [weekFilter, setWeekFilter] = useState("ALL");
  const [error, setError] = useState("");

  const loadAgenda = async (range = filters) => {
    try {
      setLoading(true);
      setError("");
      const res = await getAgendaRangoRequest(range);
      setData(res);
    } catch (err) {
      setError(err?.response?.data?.error || t("agenda.weeklyLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgenda(initialRange);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    loadAgenda(filters);
  };

  const handlePrintReport = () => {
    window.print?.();
  };

  const handleExportCsv = () => {
    try {
      downloadAgendaSemanalCsv({
        fechaDesde: filters.fecha_desde,
        fechaHasta: filters.fecha_hasta,
        ownerLabel:
          ownerOptions.find((option) => option.value === ownerFilter)?.label ||
          t("agenda.allOwners"),
        summary,
        ownerSummary,
        visibleDays,
      });
      toast.success(t("agenda.exportWeeklyCsvSuccess"));
    } catch {
      toast.error(t("agenda.exportWeeklyCsvError"));
    }
  };

  const handleGenerarVisita = async (row) => {
    try {
      setActionLoading(true);
      await generarEjecucionProgramacionRequest(row.id_programacion);
      toast.success(t("agenda.generateVisitSuccess"));
      await loadAgenda(filters);
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
      await generarOrdenDesdeEjecucionProgramacionRequest(row.id_ejecucion_actual);
      toast.success(t("agenda.generateOrderSuccess"));
      await loadAgenda(filters);
    } catch (err) {
      const message = err?.response?.data?.error || t("agenda.generateOrderError");
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const getDaySignal = (day) => {
    if (!day.programaciones.length && !day.ordenes.length) return "QUIET";
    if (day.programaciones.some((row) => !row.id_ejecucion_actual)) return "NEEDS_VISIT";
    if (day.programaciones.some((row) => row.id_ejecucion_actual && !row.id_orden_trabajo_visita)) {
      return "NEEDS_ORDER";
    }
    if (day.ordenes.length) return "WITH_ORDERS";
    return "ON_TRACK";
  };

  const groupedDays = useMemo(() => {
    const byDate = new Map(
      buildDateRange(filters.fecha_desde, filters.fecha_hasta).map((date) => [
        date,
        { fecha: date, programaciones: [], ordenes: [] },
      ]),
    );

    const matchesOwner = (row) =>
      ownerFilter === "ALL" || String(row.id_empleado_responsable || "") === ownerFilter;

    (data?.programaciones || []).forEach((row) => {
      if (!matchesOwner(row)) return;
      const key = row.proxima_fecha;
      if (!byDate.has(key)) {
        byDate.set(key, { fecha: key, programaciones: [], ordenes: [] });
      }
      byDate.get(key).programaciones.push(row);
    });

    (data?.ordenes || []).forEach((row) => {
      const key = row.fecha_servicio;
      if (!byDate.has(key)) {
        byDate.set(key, { fecha: key, programaciones: [], ordenes: [] });
      }
      byDate.get(key).ordenes.push(row);
    });

    return Array.from(byDate.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [data, filters.fecha_desde, filters.fecha_hasta, ownerFilter]);

  const ownerOptions = useMemo(() => {
    const map = new Map();
    (data?.programaciones || []).forEach((row) => {
      if (row.id_empleado_responsable && row.empleado_responsable) {
        map.set(String(row.id_empleado_responsable), row.empleado_responsable);
      }
    });
    return [
      { value: "ALL", label: t("agenda.allOwners") },
      ...Array.from(map.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [data, t]);

  const weekFilterOptions = useMemo(
    () =>
      WEEK_FILTERS.map((value) => ({
        value,
        label: t(`agenda.weekFilters.${value}`),
      })),
    [t],
  );

  const visibleDays = useMemo(() => {
    const matchesWeekFilter = (day) => {
      switch (weekFilter) {
        case "ACTION_NEEDED":
          return ["NEEDS_VISIT", "NEEDS_ORDER"].includes(getDaySignal(day));
        case "WITHOUT_ORDER":
          return day.programaciones.some((row) => !row.id_orden_trabajo_visita);
        case "WITH_ORDERS":
          return day.ordenes.length > 0;
        case "ALL":
        default:
          return true;
      }
    };

    return groupedDays.filter(matchesWeekFilter);
  }, [groupedDays, weekFilter]);

  const summary = useMemo(() => {
    const totalProgramaciones = data?.resumen?.total_programaciones || 0;
    const totalOrdenes = data?.resumen?.total_ordenes || 0;
    const daysWithActivity = visibleDays.filter(
      (day) => day.programaciones.length || day.ordenes.length,
    ).length;
    const daysWithoutOrders = visibleDays.filter(
      (day) => day.programaciones.length && !day.ordenes.length,
    ).length;
    const daysNeedingAction = visibleDays.filter((day) =>
      ["NEEDS_VISIT", "NEEDS_ORDER"].includes(getDaySignal(day)),
    ).length;
    const daysWithOrders = visibleDays.filter((day) => day.ordenes.length > 0).length;

    return {
      totalProgramaciones,
      totalOrdenes,
      daysWithActivity,
      daysWithoutOrders,
      daysNeedingAction,
      daysWithOrders,
    };
  }, [data, visibleDays]);

  const ownerSummary = useMemo(() => {
    const map = new Map();
    const filteredProgramaciones = (data?.programaciones || []).filter(
      (row) =>
        ownerFilter === "ALL" || String(row.id_empleado_responsable || "") === ownerFilter,
    );

    filteredProgramaciones.forEach((row) => {
      const key = row.id_empleado_responsable
        ? String(row.id_empleado_responsable)
        : "UNASSIGNED";
      const label = row.empleado_responsable || t("schedules.form.unassigned");

      if (!map.has(key)) {
        map.set(key, {
          key,
          label,
          total: 0,
          withoutVisit: 0,
          withVisit: 0,
          withoutOrder: 0,
          withOrder: 0,
        });
      }

      const item = map.get(key);
      item.total += 1;

      if (!row.id_ejecucion_actual) {
        item.withoutVisit += 1;
      } else {
        item.withVisit += 1;
      }

      if (row.id_orden_trabajo_visita) {
        item.withOrder += 1;
      } else {
        item.withoutOrder += 1;
      }
    });

    return Array.from(map.values())
      .map((item) => {
        let signal = "CONTROLLED";
        if (item.withoutVisit > 0) {
          signal = "ATTENTION";
        } else if (item.withoutOrder > 0) {
          signal = "FOLLOW_UP";
        }

        return {
          ...item,
          signal,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [data, ownerFilter, t]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between print-hidden">
        <div>
          <h1 className="text-2xl font-bold">{t("agenda.weeklyTitle")}</h1>
          <p className="text-sm text-slate-500">{t("agenda.weeklySubtitle")}</p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {t("agenda.exportWeeklyCsv")}
        </button>

        <button
          type="button"
          onClick={handlePrintReport}
          className="rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {t("agenda.printWeeklyReport")}
        </button>
      </div>

      <section className="print-only rounded-2xl border bg-white p-5">
        <h1 className="text-2xl font-bold text-slate-900">{t("agenda.weeklyReportTitle")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("agenda.weeklyReportSubtitle")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("agenda.reportRange")}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {filters.fecha_desde} - {filters.fecha_hasta}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {t("agenda.reportOwner")}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {ownerOptions.find((option) => option.value === ownerFilter)?.label ||
                t("agenda.allOwners")}
            </p>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="print-hidden grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-[minmax(0,220px)_minmax(0,220px)_minmax(0,220px)_auto]"
      >
        <input
          type="date"
          value={filters.fecha_desde}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, fecha_desde: e.target.value }))
          }
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <input
          type="date"
          value={filters.fecha_hasta}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, fecha_hasta: e.target.value }))
          }
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          {ownerOptions.map((option) => (
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

      {loading && <Loader text={t("agenda.loadingWeekly")} />}

      {!loading && error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title={t("agenda.weekSchedules")} value={summary.totalProgramaciones} />
            <StatCard title={t("agenda.weekOrders")} value={summary.totalOrdenes} />
            <StatCard title={t("agenda.weekActionDays")} value={summary.daysNeedingAction} />
            <StatCard title={t("agenda.weekWithOrdersDays")} value={summary.daysWithOrders} />
          </div>

          <section className="print-hidden space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold">{t("agenda.weekControlTitle")}</h2>
              <p className="text-sm text-slate-500">{t("agenda.weekControlDescription")}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {weekFilterOptions.map((option) => {
                const active = weekFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setWeekFilter(option.value)}
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

          <section className="space-y-4 rounded-2xl border bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold">{t("agenda.ownerSummaryTitle")}</h2>
              <p className="text-sm text-slate-500">{t("agenda.ownerSummaryDescription")}</p>
            </div>

            {ownerSummary.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {ownerSummary.map((item) => (
                  <article key={item.key} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{item.label}</h3>
                        <p className="text-sm text-slate-500">
                          {t("agenda.ownerAssignedCount", { count: item.total })}
                        </p>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          ownerSignalStyles[item.signal] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t(`agenda.ownerSignals.${item.signal}`)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {t("agenda.ownerMetricTotal")}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{item.total}</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {t("agenda.ownerMetricWithoutVisit")}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          {item.withoutVisit}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {t("agenda.ownerMetricWithoutOrder")}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          {item.withoutOrder}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {t("agenda.ownerMetricWithOrder")}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">
                          {item.withOrder}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title={t("agenda.noOwnerSummaryTitle")}
                description={t("agenda.noOwnerSummaryDescription")}
              />
            )}
          </section>

          {visibleDays.some((day) => day.programaciones.length || day.ordenes.length) ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {visibleDays.map((day) => (
                <article key={day.fecha} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
                        {t("agenda.weekDay")}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-slate-900">
                        {formatDayLabel(day.fecha, locale)}
                      </h2>
                      <p className="text-sm text-slate-500">{day.fecha}</p>
                      <div className="mt-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            daySignalStyles[getDaySignal(day)] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {t(`agenda.weekSignals.${getDaySignal(day)}`)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/agenda/hoy?fecha=${day.fecha}`)}
                      className="rounded-lg border px-3 py-2 text-xs hover:bg-slate-50"
                    >
                      {t("agenda.openDay")}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {t("agenda.scheduledServices")}
                        </h3>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {day.programaciones.length}
                        </span>
                      </div>

                      {day.programaciones.length ? (
                        <div className="mt-3 space-y-2">
                          {day.programaciones.slice(0, 3).map((row) => (
                            <div key={row.id_programacion} className="rounded-xl bg-white px-3 py-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-900">
                                    {row.cliente}
                                  </p>
                                  <p className="truncate text-xs text-slate-500">
                                    {row.servicio} · {row.hora_programada || t("agenda.noHour")}
                                  </p>
                                  <p className="truncate text-xs text-slate-500">
                                    {row.empleado_responsable || t("schedules.form.unassigned")}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                      visitBadgeStyles[row.estado_visita_actual] ||
                                      "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {t(
                                      `schedules.visitStates.${
                                        row.estado_visita_actual || "SIN_VISITA"
                                      }`,
                                    )}
                                  </span>
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/programaciones/${row.id_programacion}`)}
                                      className="print-hidden rounded-lg border px-2.5 py-1 text-[11px] hover:bg-slate-50"
                                    >
                                      {t("agenda.viewSchedule")}
                                    </button>
                                    {!row.id_ejecucion_actual ? (
                                      <button
                                        type="button"
                                        onClick={() => handleGenerarVisita(row)}
                                        disabled={actionLoading}
                                        className="print-hidden rounded-lg border px-2.5 py-1 text-[11px] text-sky-700 hover:bg-sky-50 disabled:opacity-60"
                                      >
                                        {t("agenda.generateVisit")}
                                      </button>
                                    ) : null}
                                    {row.id_ejecucion_actual && !row.id_orden_trabajo_visita ? (
                                      <button
                                        type="button"
                                        onClick={() => handleGenerarOrden(row)}
                                        disabled={actionLoading}
                                        className="print-hidden rounded-lg border px-2.5 py-1 text-[11px] text-sky-700 hover:bg-sky-50 disabled:opacity-60"
                                      >
                                        {t("agenda.generateOrder")}
                                      </button>
                                    ) : null}
                                    {row.id_orden_trabajo_visita ? (
                                      <button
                                        type="button"
                                        onClick={() => navigate(`/ordenes/${row.id_orden_trabajo_visita}`)}
                                        className="print-hidden rounded-lg border px-2.5 py-1 text-[11px] hover:bg-slate-50"
                                      >
                                        {t("agenda.viewOrder")}
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">{t("agenda.noWeekSchedules")}</p>
                      )}
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {t("agenda.workOrders")}
                        </h3>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {day.ordenes.length}
                        </span>
                      </div>

                      {day.ordenes.length ? (
                        <div className="mt-3 space-y-2">
                          {day.ordenes.slice(0, 3).map((row) => (
                            <div key={row.id_orden_trabajo} className="rounded-xl bg-white px-3 py-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-900">
                                    {row.numero_orden}
                                  </p>
                                  <p className="truncate text-xs text-slate-500">{row.cliente}</p>
                                  <p className="truncate text-xs text-slate-500">
                                    {row.hora_inicio_programada || t("agenda.noHour")}
                                  </p>
                                </div>
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                    orderBadgeStyles[row.estado] ||
                                    "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {t(`orders.statuses.${row.estado}`)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-slate-500">{t("agenda.noWeekOrders")}</p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t("agenda.noActivityTitle")}
              description={t("agenda.noActivityDescription")}
            />
          )}
        </>
      )}
    </div>
  );
};

export default AgendaSemanalPage;
