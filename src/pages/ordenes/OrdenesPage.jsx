import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  changeEstadoOrdenRequest,
  createOrdenRequest,
  getOrdenesRequest,
} from "../../api/ordenes.api";
import AlertMessage from "../../components/common/AlertMessage";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/common/Pagination";
import TableBase from "../../components/common/TableBase";
import { useI18n } from "../../context/i18n.context";
import { useToast } from "../../context/toast.context";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { extractApiError } from "../../lib/api";
import { formatCurrency } from "../../utils/currency";
import OrdenForm from "./components/OrdenForm";

const initialFilters = {
  estado: "",
  tipo_visita: "",
  origen: "",
  fecha_desde: "",
  fecha_hasta: "",
};

const OrdenesPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();

  const list = usePaginatedList({
    fetcher: getOrdenesRequest,
    initialFilters,
    errorMessage: t("orders.loadError"),
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [changingEstado, setChangingEstado] = useState(false);

  const handleFilter = (e) => {
    e.preventDefault();
    list.applyFilters();
  };

  const quickFilters = [
    { label: t("orders.pending"), apply: () => list.setFilter("estado", "PENDIENTE") },
    { label: t("orders.inProgress"), apply: () => list.setFilter("estado", "EN_PROCESO") },
    { label: t("orders.urgent"), apply: () => list.setFilter("tipo_visita", "URGENTE") },
    {
      label: t("orders.clear"),
      apply: () => {
        list.setFilter("estado", "");
        list.setFilter("tipo_visita", "");
        list.setFilter("origen", "");
        list.setFilter("fecha_desde", "");
        list.setFilter("fecha_hasta", "");
      },
    },
  ];

  const openCancelModal = (orden) => {
    setCancelTarget(orden);
    setCancelReason("");
    list.setError("");
    setCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setCancelModalOpen(false);
    setCancelTarget(null);
    setCancelReason("");
  };

  const handleCambiarEstado = async (row, estado, motivoCancelacion = null) => {
    try {
      setChangingEstado(true);
      list.setError("");

      await changeEstadoOrdenRequest(row.id_orden_trabajo, {
        estado,
        motivo_cancelacion: motivoCancelacion,
      });

      closeCancelModal();
      list.reload();
      toast.success(`Orden ${row.numero_orden} actualizada a ${estado}.`);
    } catch (err) {
      const message = extractApiError(err, t("orders.changeError"));
      list.setError(message);
      toast.error(message);
    } finally {
      setChangingEstado(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim() || !cancelTarget) {
      list.setError(t("orders.cancelReasonRequired"));
      return;
    }
    await handleCambiarEstado(cancelTarget, "CANCELADA", cancelReason.trim());
  };

  const handleCreateOrden = async (form) => {
    try {
      setSaving(true);
      list.setError("");
      await createOrdenRequest(form);
      setModalOpen(false);
      list.reload();
      toast.success(t("orders.createSuccess"));
    } catch (err) {
      const message = extractApiError(err, t("orders.createError"));
      list.setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      { key: "numero_orden", label: t("orders.order") },
      { key: "fecha_servicio", label: t("orders.date") },
      { key: "cliente", label: t("orders.client") },
      { key: "nombre_propiedad", label: t("orders.property") },
      {
        key: "tecnicos",
        label: t("orders.employees"),
        render: (row) => row.tecnicos || "-",
      },
      { key: "tipo_visita", label: t("orders.type") },
      { key: "origen", label: t("orders.origin") },
      {
        key: "total_orden",
        label: t("orders.total"),
        render: (row) => formatCurrency(row.total_orden),
      },
      {
        key: "estado",
        label: t("orders.status"),
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              row.estado === "COMPLETADA"
                ? "bg-green-100 text-green-700"
                : row.estado === "CANCELADA"
                  ? "bg-red-100 text-red-700"
                  : row.estado === "EN_PROCESO"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {row.estado}
          </span>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("orders.title")}</h1>
          <p className="text-sm text-slate-500">{t("orders.subtitle")}</p>
        </div>

        <button
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          onClick={() => setModalOpen(true)}
        >
          {t("orders.new")}
        </button>
      </div>

      <AlertMessage message={list.error} />

      <form
        onSubmit={handleFilter}
        className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-5"
      >
        <select
          value={list.filters.estado}
          onChange={(e) => list.setFilter("estado", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("orders.allStatuses")}</option>
          <option value="PENDIENTE">PENDIENTE</option>
          <option value="PROGRAMADA">PROGRAMADA</option>
          <option value="EN_PROCESO">EN_PROCESO</option>
          <option value="COMPLETADA">COMPLETADA</option>
          <option value="REPROGRAMADA">REPROGRAMADA</option>
          <option value="CANCELADA">CANCELADA</option>
        </select>

        <select
          value={list.filters.tipo_visita}
          onChange={(e) => list.setFilter("tipo_visita", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("orders.allTypes")}</option>
          <option value="PROGRAMADA">PROGRAMADA</option>
          <option value="EXTRA">EXTRA</option>
          <option value="URGENTE">URGENTE</option>
        </select>

        <select
          value={list.filters.origen}
          onChange={(e) => list.setFilter("origen", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("orders.allOrigins")}</option>
          <option value="MANUAL">MANUAL</option>
          <option value="PROGRAMACION">PROGRAMACION</option>
          <option value="COTIZACION">COTIZACION</option>
        </select>

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
          className="rounded-xl border px-4 py-3 font-medium hover:bg-slate-50 md:col-span-5"
        >
          {t("common.filter")}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {quickFilters.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.apply}
            className="rounded-full border bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 hover:bg-slate-50"
          >
            {item.label}
          </button>
        ))}
      </div>

      {!list.loading && (
        <div className="surface-card rounded-[1.5rem] bg-white px-4 py-3 text-sm text-slate-600">
          {t("orders.filterSummary", { count: list.pagination.total })}
        </div>
      )}

      {list.loading && <Loader text={t("orders.loading")} />}

      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState title={t("orders.emptyTitle")} description={t("orders.emptyDescription")} />
      )}

      {!list.loading && list.items.length > 0 && (
        <div className="space-y-1">
          <TableBase
            columns={columns}
            data={list.items}
            renderActions={(row) => (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigate(`/ordenes/${row.id_orden_trabajo}`)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                >
                  {t("orders.detail")}
                </button>

                {row.estado === "PENDIENTE" && (
                  <button
                    onClick={() => handleCambiarEstado(row, "EN_PROCESO")}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                  >
                    {t("orders.start")}
                  </button>
                )}

                {row.estado === "EN_PROCESO" && (
                  <button
                    onClick={() => handleCambiarEstado(row, "COMPLETADA")}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-green-50"
                  >
                    {t("orders.complete")}
                  </button>
                )}

                {row.estado !== "CANCELADA" && row.estado !== "COMPLETADA" && (
                  <button
                    onClick={() => openCancelModal(row)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    {t("orders.cancel")}
                  </button>
                )}
              </div>
            )}
          />
          <Pagination pagination={list.pagination} onPageChange={list.setPage} />
        </div>
      )}

      {modalOpen && (
        <Modal title={t("orders.new")} onClose={() => setModalOpen(false)}>
          <OrdenForm
            loading={saving}
            onSubmit={handleCreateOrden}
            onCancel={() => setModalOpen(false)}
          />
        </Modal>
      )}

      {cancelModalOpen && cancelTarget && (
        <Modal
          title={t("orders.cancelTitle", { number: cancelTarget.numero_orden })}
          onClose={closeCancelModal}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{t("orders.cancelDescription")}</p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              placeholder={t("orders.cancelPlaceholder")}
              className="w-full rounded-xl border px-4 py-3"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCancelModal}
                className="rounded-xl border px-4 py-2"
                disabled={changingEstado}
              >
                {t("orders.back")}
              </button>

              <button
                type="button"
                onClick={handleConfirmCancel}
                className="rounded-xl bg-red-600 px-4 py-2 text-white"
                disabled={changingEstado}
              >
                {changingEstado ? t("orders.cancelling") : t("orders.confirmCancel")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OrdenesPage;
