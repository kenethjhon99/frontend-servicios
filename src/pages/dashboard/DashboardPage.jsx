import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardBaseRequest } from "../../api/alertas.api";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import StatCard from "../../components/common/StatCard";
import { useAuth } from "../../context/auth.context";
import { useI18n } from "../../context/i18n.context";
import { useToast } from "../../context/toast.context";
import { listDraftSnapshots } from "../../hooks/useFormDraft";
import { formatCurrency } from "../../utils/currency";

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildDefaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return {
    fecha_desde: toIsoDate(start),
    fecha_hasta: toIsoDate(end),
  };
};

const buildTodayRange = () => {
  const today = new Date();
  const iso = toIsoDate(today);
  return {
    fecha_desde: iso,
    fecha_hasta: iso,
  };
};

const buildLastDaysRange = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return {
    fecha_desde: toIsoDate(start),
    fecha_hasta: toIsoDate(end),
  };
};

const buildCurrentMonthRange = () => {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  return {
    fecha_desde: toIsoDate(start),
    fecha_hasta: toIsoDate(end),
  };
};

const formatShortDate = (value) => {
  const [, month, day] = String(value).slice(0, 10).split("-");
  return `${month}/${day}`;
};

const buildLinePath = (values, width = 100, height = 36) => {
  if (!values.length) return "";

  const max = Math.max(...values, 1);
  const stepX = values.length === 1 ? 0 : width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
};

const average = (values = []) => {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + Number(value || 0), 0) / values.length;
};

const formatRelativeDraft = (isoValue, t) => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return t("dashboard.quickUpdated");
  }

  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return t("dashboard.savedMoment");
  if (diffMinutes < 60) return t("dashboard.savedMinutes", { value: diffMinutes });

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return t("dashboard.savedHours", { value: diffHours });

  const diffDays = Math.round(diffHours / 24);
  return t("dashboard.savedDays", { value: diffDays });
};

const buildDraftMeta = (t) => [
  {
    match: "cliente-form-",
    title: t("dashboard.draftTypes.client"),
    accent: "from-sky-500 to-cyan-500",
  },
  {
    match: "orden-form-",
    title: t("dashboard.draftTypes.order"),
    accent: "from-emerald-500 to-teal-500",
  },
  {
    match: "cotizacion-form-",
    title: t("dashboard.draftTypes.quote"),
    accent: "from-amber-500 to-orange-500",
  },
  {
    match: "programacion-form-",
    title: t("dashboard.draftTypes.schedule"),
    accent: "from-violet-500 to-fuchsia-500",
  },
];

const describeDraft = (draft, t, draftMeta) => {
  const meta =
    draftMeta.find((item) => draft.storageKey.startsWith(item.match)) || draftMeta[0];
  const snapshot = draft.values || {};
  const step =
    typeof snapshot.step === "number" && Number.isFinite(snapshot.step) ? snapshot.step + 1 : null;
  const form = snapshot.form || {};

  const summary =
    form.nombre_completo ||
    form.nombre_empresa ||
    form.fecha_servicio ||
    form.proxima_fecha ||
    form.vigencia_hasta ||
    form.observaciones ||
    t("dashboard.pendingData");

  return {
    ...meta,
    stepLabel: step ? t("dashboard.step", { value: step }) : t("dashboard.inProgress"),
    summary,
  };
};

const describeTrend = (current, baseline, t) => {
  const safeBaseline = Number(baseline || 0);
  const safeCurrent = Number(current || 0);

  if (!safeBaseline && !safeCurrent) {
    return { direction: "flat", label: t("dashboard.noVariation") };
  }

  if (!safeBaseline) {
    return { direction: "up", label: t("dashboard.aboveAverage", { value: 100 }) };
  }

  const diff = Math.abs((((safeCurrent - safeBaseline) / safeBaseline) * 100).toFixed(0));

  if (safeCurrent > safeBaseline) {
    return { direction: "up", label: t("dashboard.aboveAverage", { value: diff }) };
  }

  if (safeCurrent < safeBaseline) {
    return { direction: "down", label: t("dashboard.belowAverage", { value: diff }) };
  }

  return { direction: "flat", label: t("dashboard.inLineAverage") };
};

const DashboardChartCard = ({ eyebrow, title, description, children }) => (
  <article className="surface-card rounded-[1.75rem] bg-white p-5">
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">{eyebrow}</p>
    <h3 className="mt-2 text-xl font-semibold text-slate-900">{title}</h3>
    <p className="mt-2 text-sm text-slate-500">{description}</p>
    <div className="mt-5">{children}</div>
  </article>
);

const MixBarChart = ({ items }) => {
  const total = items.reduce((acc, item) => acc + item.raw, 0) || 1;
  const colors = [
    "from-sky-500 to-cyan-500",
    "from-emerald-500 to-green-500",
    "from-amber-500 to-orange-500",
  ];

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const percentage = Math.round((item.raw / total) * 100);
        return (
          <div key={item.key} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-600">{item.title}</span>
              <span className="font-semibold text-slate-900">{percentage}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${colors[index % colors.length]}`}
                style={{ width: `${Math.max(10, percentage)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PeriodLineChart = ({ data = [] }) => {
  const values = data.map((item) => Number(item.servicios_programados || 0));
  const path = buildLinePath(values);
  const max = Math.max(...values, 1);

  return (
    <div className="rounded-[1.5rem] border border-slate-200/70 bg-slate-50/80 p-4">
      <div className="overflow-hidden rounded-2xl bg-white px-4 py-5 shadow-sm">
        <svg viewBox="0 0 100 44" className="h-36 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="servicesGradient" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          <path
            d="M 0 42 H 100"
            fill="none"
            stroke="rgba(148, 163, 184, 0.32)"
            strokeDasharray="3 3"
            strokeWidth="0.8"
          />
          <path d={path} fill="none" stroke="url(#servicesGradient)" strokeWidth="2.8" />
          {data.map((item, index) => {
            const x = data.length === 1 ? 50 : (index * 100) / (data.length - 1);
            const y = 38 - (Number(item.servicios_programados || 0) / max) * 36;
            return (
              <g key={item.fecha}>
                <circle cx={x} cy={y} r="2.7" fill="#0f172a" />
                <title>{`${item.fecha}: ${item.servicios_programados}`}</title>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {data.map((item) => (
          <div key={item.fecha} className="rounded-2xl bg-white px-3 py-3 text-center shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {formatShortDate(item.fecha)}
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {item.servicios_programados}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const PeriodPaymentBars = ({ data = [] }) => {
  const max = Math.max(...data.map((item) => Number(item.pagos_cobrados || 0)), 1);

  return (
    <div className="grid gap-3">
      {data.map((item) => {
        const value = Number(item.pagos_cobrados || 0);
        return (
          <div key={item.fecha} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-600">{formatShortDate(item.fecha)}</span>
              <span className="font-semibold text-slate-900">{formatCurrency(value)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500"
                style={{ width: `${Math.max(8, (value / max) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DashboardPage = () => {
  const auth = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const draftScope =
    auth?.user?.id_usuario ||
    auth?.user?.username ||
    auth?.user?.correo ||
    auth?.user?.nombre ||
    "guest";
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(() => buildDefaultRange());
  const [appliedFilters, setAppliedFilters] = useState(() => buildDefaultRange());
  const [recentDrafts, setRecentDrafts] = useState([]);

  const kpiConfig = useMemo(
    () => [
      { key: "servicios_hoy", title: t("dashboard.kpis.servicios_hoy"), type: "count" },
      { key: "servicios_manana", title: t("dashboard.kpis.servicios_manana"), type: "count" },
      {
        key: "servicios_atrasados",
        title: t("dashboard.kpis.servicios_atrasados"),
        type: "count",
      },
      { key: "creditos_vencidos", title: t("dashboard.kpis.creditos_vencidos"), type: "count" },
      { key: "pagos_hoy", title: t("dashboard.kpis.pagos_hoy"), type: "money" },
      { key: "ingresos_mes", title: t("dashboard.kpis.ingresos_mes"), type: "money" },
      { key: "clientes_activos", title: t("dashboard.kpis.clientes_activos"), type: "count" },
      {
        key: "alertas_no_leidas",
        title: t("dashboard.kpis.alertas_no_leidas"),
        type: "count",
      },
    ],
    [t]
  );

  const draftMeta = useMemo(() => buildDraftMeta(t), [t]);

  useEffect(() => {
    const loadDrafts = () => {
      setRecentDrafts(listDraftSnapshots({ userScope: draftScope }).slice(0, 4));
    };

    loadDrafts();
    window.addEventListener("focus", loadDrafts);
    document.addEventListener("visibilitychange", loadDrafts);

    return () => {
      window.removeEventListener("focus", loadDrafts);
      document.removeEventListener("visibilitychange", loadDrafts);
    };
  }, [draftScope]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await dashboardBaseRequest(appliedFilters);
        setData(res);
      } catch (_err) {
        setError(t("dashboard.loadError"));
        toast.error(t("dashboard.refreshError"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [appliedFilters, t, toast]);

  const resumen = data?.resumen || {};

  const stats = useMemo(
    () =>
      kpiConfig.map((item) => {
        const raw = Number(resumen[item.key] || 0);
        return {
          ...item,
          raw,
          value: item.type === "money" ? formatCurrency(raw) : raw,
        };
      }),
    [kpiConfig, resumen]
  );

  const trendMetrics = useMemo(() => {
    const candidates = stats.filter((item) =>
      ["servicios_hoy", "servicios_manana", "servicios_atrasados", "alertas_no_leidas"].includes(
        item.key
      )
    );
    const max = Math.max(...candidates.map((item) => item.raw), 1);
    return candidates.map((item) => ({
      ...item,
      width: `${Math.max(18, (item.raw / max) * 100)}%`,
    }));
  }, [stats]);

  const panelOperativo = [
    {
      label: t("dashboard.pendingToday"),
      value: resumen.servicios_hoy ?? 0,
      hint: t("dashboard.pendingTodayHint"),
    },
    {
      label: t("dashboard.overdue"),
      value: resumen.servicios_atrasados ?? 0,
      hint: t("dashboard.overdueHint"),
    },
    {
      label: t("dashboard.alerts"),
      value: resumen.alertas_no_leidas ?? 0,
      hint: t("dashboard.alertsHint"),
    },
  ];

  const mixMetrics = useMemo(
    () =>
      stats.filter((item) =>
        ["servicios_hoy", "servicios_manana", "servicios_atrasados"].includes(item.key)
      ),
    [stats]
  );

  const periodSeries = data?.serie_diaria || [];
  const totalsPeriodo = data?.totales_periodo || {
    servicios_programados: 0,
    pagos_cobrados: 0,
    alertas_creadas: 0,
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    toast.info(t("dashboard.rangeApplied"), { duration: 2200 });
  };

  const resetFilters = () => {
    const next = buildDefaultRange();
    setFilters(next);
    setAppliedFilters(next);
    toast.info(t("dashboard.rangeReset"), { duration: 2200 });
  };

  const applyPreset = (preset) => {
    setFilters(preset.range);
    setAppliedFilters(preset.range);
    toast.info(preset.toast, { duration: 2200 });
  };

  const presets = [
    { label: t("dashboard.today"), range: buildTodayRange(), toast: t("dashboard.todayToast") },
    { label: t("dashboard.last7"), range: buildLastDaysRange(7), toast: t("dashboard.last7Toast") },
    {
      label: t("dashboard.last30"),
      range: buildLastDaysRange(30),
      toast: t("dashboard.last30Toast"),
    },
    {
      label: t("dashboard.thisMonth"),
      range: buildCurrentMonthRange(),
      toast: t("dashboard.monthToast"),
    },
  ];

  const serviceSeries = useMemo(
    () => periodSeries.map((item) => Number(item.servicios_programados || 0)),
    [periodSeries]
  );
  const paymentSeries = useMemo(
    () => periodSeries.map((item) => Number(item.pagos_cobrados || 0)),
    [periodSeries]
  );
  const alertSeries = useMemo(
    () => periodSeries.map((item) => Number(item.alertas_creadas || 0)),
    [periodSeries]
  );

  const statTrendByKey = useMemo(() => {
    const avgServices = average(serviceSeries);
    const avgPayments = average(paymentSeries);
    const avgAlerts = average(alertSeries);

    return {
      servicios_hoy: {
        ...describeTrend(Number(resumen.servicios_hoy || 0), avgServices, t),
        sparklineValues: serviceSeries,
      },
      servicios_manana: {
        ...describeTrend(Number(resumen.servicios_manana || 0), avgServices, t),
        sparklineValues: serviceSeries,
      },
      servicios_atrasados: {
        ...describeTrend(Number(resumen.servicios_atrasados || 0), avgServices, t),
        sparklineValues: serviceSeries,
      },
      pagos_hoy: {
        ...describeTrend(Number(resumen.pagos_hoy || 0), avgPayments, t),
        sparklineValues: paymentSeries,
      },
      ingresos_mes: {
        ...describeTrend(
          Number(resumen.ingresos_mes || 0),
          avgPayments * Math.max(paymentSeries.length, 1),
          t
        ),
        sparklineValues: paymentSeries,
      },
      alertas_no_leidas: {
        ...describeTrend(Number(resumen.alertas_no_leidas || 0), avgAlerts, t),
        sparklineValues: alertSeries,
      },
      creditos_vencidos: {
        direction: Number(resumen.creditos_vencidos || 0) > 0 ? "down" : "flat",
        label:
          Number(resumen.creditos_vencidos || 0) > 0
            ? t("dashboard.prioritizeCollections")
            : t("dashboard.noCollectionsFocus"),
        sparklineValues: alertSeries,
      },
      clientes_activos: {
        direction: "flat",
        label: t("dashboard.activeBase"),
        sparklineValues: serviceSeries,
      },
    };
  }, [alertSeries, paymentSeries, resumen, serviceSeries, t]);

  const executiveHighlights = useMemo(() => {
    const topServiceDay = [...periodSeries].sort(
      (a, b) => Number(b.servicios_programados || 0) - Number(a.servicios_programados || 0)
    )[0];
    const topPaymentDay = [...periodSeries].sort(
      (a, b) => Number(b.pagos_cobrados || 0) - Number(a.pagos_cobrados || 0)
    )[0];
    const averageServices = average(serviceSeries);

    return [
      {
        label: t("dashboard.topServicePeak"),
        value: topServiceDay
          ? t("dashboard.servicesLabel", { value: topServiceDay.servicios_programados })
          : t("common.noDataTitle"),
        hint: topServiceDay
          ? t("dashboard.bestDay", { value: formatShortDate(topServiceDay.fecha) })
          : t("dashboard.noHighlightedDays"),
      },
      {
        label: t("dashboard.bestDailyCollection"),
        value: topPaymentDay ? formatCurrency(topPaymentDay.pagos_cobrados) : "$0.00",
        hint: topPaymentDay
          ? t("dashboard.peakPoint", { value: formatShortDate(topPaymentDay.fecha) })
          : t("dashboard.noFinancialMovement"),
      },
      {
        label: t("dashboard.dailyAverage"),
        value: averageServices.toFixed(1),
        hint: t("dashboard.servicesPerDay"),
      },
    ];
  }, [periodSeries, serviceSeries, t]);

  const cobranzaFocus = useMemo(() => {
    const focus = data?.cobranza_foco;
    const mainClient = focus?.clientes_prioritarios?.[0] || null;
    const seguimiento = focus?.seguimiento_resumen || {};
    const leadOwner = focus?.responsable_principal || null;

    return {
      mainClient,
      totalClients: Number(focus?.total_clientes_prioritarios || 0),
      totalOverdueCredits: Number(focus?.creditos_vencidos_total || 0),
      totalBalance: Number(focus?.saldo_prioritario_total || 0),
      paymentPromises: Number(seguimiento.promesas_pago || 0),
      noResponse: Number(seguimiento.sin_respuesta || 0),
      withoutFollowUp: Number(seguimiento.sin_seguimiento || 0),
      dueContacts: Number(seguimiento.contactos_vencidos || 0),
      leadOwner,
    };
  }, [data]);

  const periodSummary = [
    {
      label: t("dashboard.servicesRange"),
      value: totalsPeriodo.servicios_programados,
      hint: t("dashboard.servicesRangeHint"),
    },
    {
      label: t("dashboard.collectedRange"),
      value: formatCurrency(totalsPeriodo.pagos_cobrados),
      hint: t("dashboard.collectedRangeHint"),
    },
    {
      label: t("dashboard.alertsRange"),
      value: totalsPeriodo.alertas_creadas,
      hint: t("dashboard.alertsRangeHint"),
    },
  ];

  if (loading) {
    return <Loader text={t("dashboard.loading")} />;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="surface-card overflow-hidden rounded-[2rem] bg-white">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div className="space-y-5">
            <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
              {t("dashboard.overview")}
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {t("dashboard.title")}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-slate-500 sm:text-lg">
                {t("dashboard.description")}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <label className="flex-1 text-sm font-medium text-slate-600">
                  {t("dashboard.from")}
                  <input
                    type="date"
                    name="fecha_desde"
                    aria-label={t("dashboard.from")}
                    value={filters.fecha_desde}
                    onChange={handleFilterChange}
                    className="mt-2 w-full rounded-xl border px-4 py-3"
                  />
                </label>

                <label className="flex-1 text-sm font-medium text-slate-600">
                  {t("dashboard.to")}
                  <input
                    type="date"
                    name="fecha_hasta"
                    aria-label={t("dashboard.to")}
                    value={filters.fecha_hasta}
                    onChange={handleFilterChange}
                    className="mt-2 w-full rounded-xl border px-4 py-3"
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyFilters}
                    className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
                  >
                    {t("dashboard.applyRange")}
                  </button>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-xl border px-4 py-3 text-sm font-medium"
                  >
                    {t("dashboard.reset")}
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 hover:bg-slate-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">{t("dashboard.rangeHint")}</p>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200/70 bg-slate-50/75 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                    {t("dashboard.rhythmTitle")}
                  </h2>
                  <p className="text-sm text-slate-500">{t("dashboard.rhythmDescription")}</p>
                </div>
              </div>

              <div className="space-y-4">
                {trendMetrics.map((item) => (
                  <div key={item.key} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-600">{item.title}</span>
                      <span className="font-semibold text-slate-900">{item.raw}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 shadow-sm"
                        style={{ width: item.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-slate-900 p-5 text-white shadow-xl">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-300">
              {t("dashboard.executiveSummary")}
            </p>
            <div className="mt-5 space-y-4">
              {panelOperativo.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-4 rounded-2xl bg-white/8 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-200">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.hint}</p>
                  </div>
                  <span className="text-2xl font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard
            key={item.key}
            title={item.title}
            value={item.value}
            trendDirection={statTrendByKey[item.key]?.direction}
            trendLabel={statTrendByKey[item.key]?.label}
            sparklineValues={statTrendByKey[item.key]?.sparklineValues}
          />
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {executiveHighlights.map((item) => (
          <DashboardChartCard
            key={item.label}
            eyebrow={t("dashboard.miniTrend")}
            title={item.label}
            description={item.hint}
          >
            <p className="text-3xl font-semibold text-slate-900">{item.value}</p>
          </DashboardChartCard>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardChartCard
          eyebrow={t("dashboard.periodAnalyzed")}
          title={t("dashboard.servicesInRange")}
          description={t("dashboard.scheduleRangeDescription", {
            from: appliedFilters.fecha_desde,
            to: appliedFilters.fecha_hasta,
          })}
        >
          <PeriodLineChart data={periodSeries} />
        </DashboardChartCard>

        <DashboardChartCard
          eyebrow={t("dashboard.distribution")}
          title={t("dashboard.balanceAgenda")}
          description={t("dashboard.balanceAgendaDescription")}
        >
          <MixBarChart items={mixMetrics} />
        </DashboardChartCard>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <DashboardChartCard
          eyebrow={t("dashboard.collectionsPeriod")}
          title={t("dashboard.paymentsBehavior")}
          description={t("dashboard.paymentsBehaviorDescription")}
        >
          <PeriodPaymentBars data={periodSeries} />
        </DashboardChartCard>

        <DashboardChartCard
          eyebrow={t("dashboard.action")}
          title={t("dashboard.periodSummary")}
          description={t("dashboard.periodSummaryDescription")}
        >
          <div className="grid gap-3 md:grid-cols-3">
            {periodSummary.map((item) => (
              <div key={item.label} className="rounded-[1.5rem] bg-slate-900 px-4 py-4 text-white">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">{item.label}</p>
                <p className="mt-3 text-3xl font-semibold">{item.value}</p>
                <p className="mt-2 text-sm text-slate-400">{item.hint}</p>
              </div>
            ))}
          </div>
        </DashboardChartCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardChartCard
          eyebrow={t("dashboard.action")}
          title={t("dashboard.collectionsFocusTitle")}
          description={t("dashboard.collectionsFocusDescription")}
        >
          {cobranzaFocus.mainClient ? (
            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-red-200/70 bg-red-50/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">
                      {cobranzaFocus.mainClient.cliente}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {t("dashboard.collectionsRiskSummary", {
                        days: cobranzaFocus.mainClient.max_dias_vencido,
                        credits: cobranzaFocus.mainClient.creditos_vencidos,
                      })}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {t("dashboard.collectionsBalanceSummary", {
                        value: formatCurrency(cobranzaFocus.mainClient.saldo_pendiente_total),
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    {t("dashboard.prioritizeCollections")}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.35rem] bg-slate-50/80 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("dashboard.collectionsRiskClients")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {cobranzaFocus.totalClients}
                  </p>
                </div>
                <div className="rounded-[1.35rem] bg-slate-50/80 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("dashboard.collectionsRiskCredits")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {cobranzaFocus.totalOverdueCredits}
                  </p>
                </div>
                <div className="rounded-[1.35rem] bg-slate-50/80 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("dashboard.collectionsRiskBalance")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatCurrency(cobranzaFocus.totalBalance)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.35rem] bg-slate-50/80 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("dashboard.collectionsPromises")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {cobranzaFocus.paymentPromises}
                  </p>
                </div>
                <div className="rounded-[1.35rem] bg-slate-50/80 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("dashboard.collectionsNoResponse")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {cobranzaFocus.noResponse}
                  </p>
                </div>
                <div className="rounded-[1.35rem] bg-slate-50/80 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("dashboard.collectionsWithoutFollowUp")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {cobranzaFocus.withoutFollowUp}
                  </p>
                </div>
                <div className="rounded-[1.35rem] bg-slate-50/80 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("dashboard.collectionsDueContacts")}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {cobranzaFocus.dueContacts}
                  </p>
                </div>
              </div>

              {cobranzaFocus.leadOwner ? (
                <div className="rounded-[1.35rem] bg-slate-50/80 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {t("dashboard.collectionsLeadOwner")}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {cobranzaFocus.leadOwner.usuario_responsable}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {t("dashboard.collectionsOwnerSummary", {
                      owner: cobranzaFocus.leadOwner.usuario_responsable,
                      clients: cobranzaFocus.leadOwner.clientes,
                    })}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/cobranza")}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
                >
                  {t("dashboard.openCollectionsBoard")}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/clientes/${cobranzaFocus.mainClient.id_cliente}`)}
                  className="rounded-xl border px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t("dashboard.openRiskClient")}
                </button>
              </div>
            </div>
          ) : (
            <EmptyState
              title={t("dashboard.noCollectionsFocus")}
              description={t("dashboard.noCollectionsFocusDescription")}
            />
          )}
        </DashboardChartCard>

        <DashboardChartCard
          eyebrow={t("dashboard.recentActivity")}
          title={t("dashboard.eventsTracking")}
          description={t("dashboard.eventsTrackingDescription")}
        >
          {data?.ultimas_alertas?.length ? (
            <div className="grid gap-3">
              {data.ultimas_alertas.slice(0, 4).map((alerta, index) => (
                <article
                  key={alerta.id_alerta}
                  className="table-row-animate rounded-[1.5rem] border border-slate-200/70 bg-slate-50/80 p-4"
                  style={{ animationDelay: `${Math.min(index * 36, 200)}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{alerta.titulo}</p>
                      <p className="mt-2 text-sm text-slate-500">{alerta.mensaje}</p>
                    </div>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                      {alerta.modulo_origen || t("dashboard.system")}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t("dashboard.noAlertsTitle")}
              description={t("dashboard.noAlertsDescription")}
            />
          )}
        </DashboardChartCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardChartCard
          eyebrow={t("dashboard.recentActivity")}
          title={t("dashboard.activeDrafts")}
          description={t("dashboard.activeDraftsDescription")}
        >
          {recentDrafts.length ? (
            <div className="grid gap-3">
              {recentDrafts.map((draft) => {
                const meta = describeDraft(draft, t, draftMeta);
                return (
                  <article
                    key={draft.scopedKey}
                    className="table-row-animate rounded-[1.5rem] border border-slate-200/70 bg-slate-50/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div
                          className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white ${meta.accent}`}
                        >
                          {meta.title}
                        </div>
                        <p className="mt-3 text-lg font-semibold text-slate-900">{meta.stepLabel}</p>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-500">{meta.summary}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                        {formatRelativeDraft(draft.savedAt, t)}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title={t("dashboard.noDraftsTitle")}
              description={t("dashboard.noDraftsDescription")}
            />
          )}
        </DashboardChartCard>

      </section>

      <section className="surface-card rounded-[2rem] bg-white p-5 lg:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              {t("dashboard.latestAlerts")}
            </h2>
            <p className="text-sm text-slate-500 sm:text-base">
              {t("dashboard.latestAlertsDescription")}
            </p>
          </div>
        </div>

        {data?.ultimas_alertas?.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.ultimas_alertas.map((alerta, index) => (
              <article
                key={alerta.id_alerta}
                className="table-row-animate rounded-[1.5rem] border border-slate-200/70 bg-slate-50/70 p-4"
                style={{ animationDelay: `${Math.min(index * 36, 200)}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{alerta.titulo}</p>
                    <p className="mt-2 text-sm text-slate-500 sm:text-base">{alerta.mensaje}</p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    {alerta.modulo_origen || t("dashboard.system")}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title={t("dashboard.noAlertsTitle")}
            description={t("dashboard.noAlertsDescription")}
          />
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
