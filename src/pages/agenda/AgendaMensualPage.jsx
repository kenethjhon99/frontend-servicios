import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCalendarioMensualRequest } from "../../api/agenda.api";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import { useI18n } from "../../context/i18n.context";
import { getCurrentYearMonth } from "../../utils/date";

const AgendaMensualPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const current = getCurrentYearMonth();

  const [filters, setFilters] = useState({
    anio: current.anio,
    mes: current.mes,
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCalendario = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await getCalendarioMensualRequest(filters);
      setData(res);
    } catch (err) {
      setError(err?.response?.data?.error || t("agenda.monthlyLoadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendario();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    loadCalendario();
  };

  const meses = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: index + 1,
        label: t(`agenda.months.${index + 1}`),
      })),
    [t]
  );

  const totalProgramaciones =
    data?.dias?.reduce((acc, item) => acc + Number(item.programaciones || 0), 0) || 0;

  const totalOrdenes =
    data?.dias?.reduce((acc, item) => acc + Number(item.ordenes || 0), 0) || 0;

  const totalVencimientos =
    data?.dias?.reduce((acc, item) => acc + Number(item.vencimientos_credito || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("agenda.monthlyTitle")}</h1>
        <p className="text-sm text-slate-500">{t("agenda.monthlySubtitle")}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-3"
      >
        <input
          type="number"
          value={filters.anio}
          onChange={(e) => setFilters((prev) => ({ ...prev, anio: e.target.value }))}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <select
          value={filters.mes}
          onChange={(e) => setFilters((prev) => ({ ...prev, mes: e.target.value }))}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          {meses.map((mes) => (
            <option key={mes.value} value={mes.value}>
              {mes.label}
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

      {loading && <Loader text={t("agenda.loadingMonthly")} />}

      {!loading && error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{t("agenda.monthSchedules")}</p>
              <h3 className="mt-2 text-2xl font-bold">{totalProgramaciones}</h3>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{t("agenda.monthOrders")}</p>
              <h3 className="mt-2 text-2xl font-bold">{totalOrdenes}</h3>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{t("agenda.monthDue")}</p>
              <h3 className="mt-2 text-2xl font-bold">{totalVencimientos}</h3>
            </div>
          </div>

          {data.dias?.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.dias.map((dia) => (
                <div key={dia.fecha} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <h3 className="font-semibold">{dia.fecha}</h3>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span>{t("agenda.schedules")}</span>
                      <strong>{dia.programaciones}</strong>
                    </div>

                    <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span>{t("agenda.orders")}</span>
                      <strong>{dia.ordenes}</strong>
                    </div>

                    <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span>{t("agenda.dueItems")}</span>
                      <strong>{dia.vencimientos_credito}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/agenda/hoy?fecha=${dia.fecha}`)}
                    className="mt-4 rounded-lg border px-3 py-2 text-xs hover:bg-slate-50"
                  >
                    {t("agenda.openDay")}
                  </button>
                </div>
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

export default AgendaMensualPage;
