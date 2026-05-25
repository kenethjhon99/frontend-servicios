import { useMemo, useState } from "react";
import { getAuditoriasRequest } from "../../api/auditoria.api";
import AlertMessage from "../../components/common/AlertMessage";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import TableBase from "../../components/common/TableBase";
import { useI18n } from "../../context/i18n.context";
import { usePaginatedList } from "../../hooks/usePaginatedList";

const ACCIONES = [
  "CREAR",
  "ACTUALIZAR",
  "CAMBIAR_ESTADO",
  "CANCELAR",
  "LOGIN",
  "RESET_PASSWORD",
  "PAGO",
  "ABONO",
];

const TABLAS = [
  "usuarios",
  "clientes",
  "propiedades",
  "categorias_servicio",
  "servicios",
  "programaciones_servicio",
  "ordenes_trabajo",
  "ordenes_trabajo_detalle",
  "evidencias_orden",
  "pagos",
  "creditos",
  "pagos_credito",
  "alertas",
];

const initialFilters = {
  tabla_afectada: "",
  accion: "",
  realizado_por: "",
  fecha_desde: "",
  fecha_hasta: "",
  q: "",
};

const AuditoriaPage = () => {
  const { t, locale } = useI18n();
  const list = usePaginatedList({
    fetcher: getAuditoriasRequest,
    initialFilters,
    errorMessage: t("audit.loadError"),
  });

  const [selected, setSelected] = useState(null);

  const handleFilter = (e) => {
    e.preventDefault();
    list.applyFilters();
  };

  const formatJson = (value) => {
    if (!value) return t("audit.noData");
    return JSON.stringify(value, null, 2);
  };

  const columns = useMemo(
    () => [
      {
        key: "fecha_evento",
        label: t("audit.date"),
        render: (row) =>
          new Date(row.fecha_evento).toLocaleString(locale === "en" ? "en-US" : "es-GT", {
            dateStyle: "short",
            timeStyle: "short",
          }),
      },
      {
        key: "realizado_por_nombre",
        label: t("audit.user"),
        render: (row) =>
          row.realizado_por_nombre
            ? `${row.realizado_por_nombre} (${row.realizado_por_username})`
            : t("audit.systemUser"),
      },
      { key: "tabla_afectada", label: t("audit.table") },
      { key: "id_registro", label: t("audit.record") },
      {
        key: "accion",
        label: t("audit.action"),
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              row.accion === "CREAR"
                ? "bg-green-100 text-green-700"
                : row.accion === "CANCELAR"
                ? "bg-red-100 text-red-700"
                : row.accion === "ACTUALIZAR"
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {row.accion}
          </span>
        ),
      },
      {
        key: "descripcion",
        label: t("audit.description"),
        render: (row) => row.descripcion || t("audit.noDescription"),
      },
    ],
    [locale, t]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("audit.title")}</h1>
        <p className="text-sm text-slate-500">{t("audit.subtitle")}</p>
      </div>

      <form
        onSubmit={handleFilter}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4"
      >
        <select
          value={list.filters.tabla_afectada}
          onChange={(e) => list.setFilter("tabla_afectada", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("audit.allTables")}</option>
          {TABLAS.map((tabla) => (
            <option key={tabla} value={tabla}>
              {tabla}
            </option>
          ))}
        </select>

        <select
          value={list.filters.accion}
          onChange={(e) => list.setFilter("accion", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("audit.allActions")}</option>
          {ACCIONES.map((accion) => (
            <option key={accion} value={accion}>
              {accion}
            </option>
          ))}
        </select>

        <input
          value={list.filters.realizado_por}
          onChange={(e) => list.setFilter("realizado_por", e.target.value)}
          placeholder={t("audit.userIdPlaceholder")}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <input
          value={list.filters.q}
          onChange={(e) => list.setFilter("q", e.target.value)}
          placeholder={t("audit.searchPlaceholder")}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <input
          type="date"
          value={list.filters.fecha_desde}
          onChange={(e) => list.setFilter("fecha_desde", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <input
          type="date"
          value={list.filters.fecha_hasta}
          onChange={(e) => list.setFilter("fecha_hasta", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        />

        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
        >
          {t("audit.filter")}
        </button>

        <button
          type="button"
          onClick={list.resetFilters}
          className="rounded-xl border px-4 py-3 text-sm font-medium hover:bg-slate-50"
        >
          {t("audit.clearFilters")}
        </button>
      </form>

      {list.loading && <Loader text={t("audit.loading")} />}

      {!list.loading && <AlertMessage message={list.error} />}

      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState title={t("audit.emptyTitle")} description={t("audit.emptyDescription")} />
      )}

      {!list.loading && !list.error && list.items.length > 0 && (
        <div className="space-y-1">
          <TableBase
            columns={columns}
            data={list.items}
            renderActions={(row) => (
              <button
                onClick={() => setSelected(row)}
                className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
              >
                {t("audit.detail")}
              </button>
            )}
          />
          <Pagination pagination={list.pagination} onPageChange={list.setPage} />
        </div>
      )}

      {selected && (
        <Modal title={t("audit.eventTitle", { id: selected.id_auditoria })} onClose={() => setSelected(null)}>
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t("audit.table")}</p>
                <p className="font-medium">{selected.tabla_afectada}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t("audit.recordId")}</p>
                <p className="font-medium">{selected.id_registro}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t("audit.action")}</p>
                <p className="font-medium">{selected.accion}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t("audit.user")}</p>
                <p className="font-medium">
                  {selected.realizado_por_nombre || t("audit.system")}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <p className="text-sm font-semibold">{t("audit.description")}</p>
              <p className="mt-2 text-sm text-slate-600">
                {selected.descripcion || t("audit.noDescriptionText")}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-slate-950 p-4 text-white">
                <h3 className="mb-3 font-semibold">{t("audit.previousValues")}</h3>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">
                  {formatJson(selected.valores_anteriores)}
                </pre>
              </div>

              <div className="rounded-2xl border bg-slate-950 p-4 text-white">
                <h3 className="mb-3 font-semibold">{t("audit.newValues")}</h3>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">
                  {formatJson(selected.valores_nuevos)}
                </pre>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditoriaPage;
