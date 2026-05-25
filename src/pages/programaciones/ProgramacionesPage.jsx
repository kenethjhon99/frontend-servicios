import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  changeEstadoProgramacionRequest,
  createProgramacionRequest,
  getProgramacionesRequest,
  updateProgramacionRequest,
} from "../../api/programaciones.api";
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
import ProgramacionForm from "./components/ProgramacionForm";

const initialFilters = {
  estado: "",
  frecuencia: "",
  prioridad: "",
  fecha_desde: "",
  fecha_hasta: "",
};

const visitBadgeStyles = {
  PENDIENTE: "bg-amber-100 text-amber-700",
  GENERADA: "bg-sky-100 text-sky-700",
  REPROGRAMADA: "bg-violet-100 text-violet-700",
  CANCELADA: "bg-red-100 text-red-700",
  COMPLETADA: "bg-green-100 text-green-700",
};

const ProgramacionesPage = () => {
  const toast = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();
  const list = usePaginatedList({
    fetcher: getProgramacionesRequest,
    initialFilters,
    errorMessage: t("schedules.loadError"),
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProgramacion, setEditingProgramacion] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [changingEstado, setChangingEstado] = useState(false);

  const handleFilter = (e) => {
    e.preventDefault();
    list.applyFilters();
  };

  const openCreateModal = () => {
    setEditingProgramacion(null);
    setModalOpen(true);
    list.setError("");
  };

  const openEditModal = (programacion) => {
    setEditingProgramacion(programacion);
    setModalOpen(true);
    list.setError("");
  };

  const handleSaveProgramacion = async (form) => {
    try {
      setSaving(true);
      list.setError("");

      if (editingProgramacion) {
        await updateProgramacionRequest(editingProgramacion.id_programacion, form);
        toast.success(t("schedules.saveEdit"));
      } else {
        await createProgramacionRequest(form);
        toast.success(t("schedules.saveNew"));
      }

      setModalOpen(false);
      setEditingProgramacion(null);
      list.reload();
    } catch (err) {
      const message = extractApiError(err, t("schedules.saveError"));
      list.setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const openCancelModal = (programacion) => {
    setCancelTarget(programacion);
    setCancelReason("");
    setCancelModalOpen(true);
    list.setError("");
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

      await changeEstadoProgramacionRequest(row.id_programacion, {
        estado,
        motivo_cancelacion: motivoCancelacion,
      });

      closeCancelModal();
      list.reload();
      toast.success(`Programacion actualizada a ${estado}.`);
    } catch (err) {
      const message = extractApiError(err, t("schedules.changeError"));
      list.setError(message);
      toast.error(message);
    } finally {
      setChangingEstado(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim() || !cancelTarget) {
      list.setError(t("schedules.cancelReasonRequired"));
      return;
    }
    await handleCambiarEstado(cancelTarget, "CANCELADA", cancelReason.trim());
  };

  const columns = useMemo(
    () => [
      { key: "cliente", label: t("schedules.client") },
      { key: "nombre_propiedad", label: t("schedules.property") },
      { key: "servicio", label: t("schedules.service") },
      { key: "categoria_servicio", label: t("schedules.category") },
      {
        key: "empleado_responsable",
        label: t("schedules.owner"),
        render: (row) => row.empleado_responsable || "-",
      },
      { key: "frecuencia", label: t("schedules.frequency") },
      { key: "proxima_fecha", label: t("schedules.nextDate") },
      {
        key: "estado_visita_actual",
        label: t("schedules.visitStatus"),
        render: (row) => {
          if (!row.estado_visita_actual) {
            return (
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {t("schedules.visitStates.SIN_VISITA")}
              </span>
            );
          }

          return (
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                visitBadgeStyles[row.estado_visita_actual] || "bg-slate-100 text-slate-700"
              }`}
            >
              {t(`schedules.visitStates.${row.estado_visita_actual}`)}
            </span>
          );
        },
      },
      {
        key: "ultima_ejecucion_fecha",
        label: t("schedules.lastVisit"),
        render: (row) =>
          row.ultima_ejecucion_fecha
            ? `${row.ultima_ejecucion_fecha} · ${t(
                `schedules.visitStates.${row.ultima_ejecucion_estado || "SIN_VISITA"}`,
              )}`
            : "-",
      },
      {
        key: "hora_programada",
        label: t("schedules.hour"),
        render: (row) => row.hora_programada || "-",
      },
      {
        key: "precio_acordado",
        label: t("schedules.price"),
        render: (row) => formatCurrency(row.precio_acordado),
      },
      { key: "prioridad", label: t("schedules.priority") },
      {
        key: "estado",
        label: t("schedules.status"),
        render: (row) => (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              row.estado === "ACTIVA"
                ? "bg-green-100 text-green-700"
                : row.estado === "CANCELADA"
                  ? "bg-red-100 text-red-700"
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
          <h1 className="text-2xl font-bold">{t("schedules.title")}</h1>
          <p className="text-sm text-slate-500">{t("schedules.subtitle")}</p>
        </div>

        <button
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
          onClick={openCreateModal}
        >
          {t("schedules.new")}
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
          <option value="">{t("schedules.allStatuses")}</option>
          <option value="ACTIVA">ACTIVA</option>
          <option value="PAUSADA">PAUSADA</option>
          <option value="FINALIZADA">FINALIZADA</option>
          <option value="CANCELADA">CANCELADA</option>
        </select>

        <select
          value={list.filters.frecuencia}
          onChange={(e) => list.setFilter("frecuencia", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("schedules.allFrequencies")}</option>
          <option value="UNICA">UNICA</option>
          <option value="SEMANAL">SEMANAL</option>
          <option value="QUINCENAL">QUINCENAL</option>
          <option value="MENSUAL">MENSUAL</option>
        </select>

        <select
          value={list.filters.prioridad}
          onChange={(e) => list.setFilter("prioridad", e.target.value)}
          className="rounded-xl border px-4 py-3 outline-none"
        >
          <option value="">{t("schedules.allPriorities")}</option>
          <option value="BAJA">BAJA</option>
          <option value="MEDIA">MEDIA</option>
          <option value="ALTA">ALTA</option>
          <option value="URGENTE">URGENTE</option>
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

      {list.loading && <Loader text={t("schedules.loading")} />}

      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState title={t("schedules.emptyTitle")} description={t("schedules.emptyDescription")} />
      )}

      {!list.loading && list.items.length > 0 && (
        <div className="space-y-1">
          <TableBase
            columns={columns}
            data={list.items}
            renderActions={(row) => (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigate(`/programaciones/${row.id_programacion}`)}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  {t("schedules.viewDetail")}
                </button>

                <button
                  onClick={() => openEditModal(row)}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                >
                  {t("schedules.editAction")}
                </button>

                {row.estado === "ACTIVA" && (
                  <button
                    onClick={() => handleCambiarEstado(row, "PAUSADA")}
                    className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                  >
                    {t("schedules.pause")}
                  </button>
                )}

                {row.estado === "PAUSADA" && (
                  <button
                    onClick={() => handleCambiarEstado(row, "ACTIVA")}
                    className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                  >
                    {t("schedules.activate")}
                  </button>
                )}

                {row.estado !== "CANCELADA" && (
                  <button
                    onClick={() => openCancelModal(row)}
                    className="rounded-lg border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    {t("schedules.cancel")}
                  </button>
                )}
              </div>
            )}
          />
          <Pagination pagination={list.pagination} onPageChange={list.setPage} />
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingProgramacion ? t("schedules.edit") : t("schedules.new")}
          onClose={() => {
            setModalOpen(false);
            setEditingProgramacion(null);
          }}
        >
          <ProgramacionForm
            initialData={editingProgramacion}
            loading={saving}
            submitLabel={editingProgramacion ? t("schedules.edit") : t("schedules.new")}
            onSubmit={handleSaveProgramacion}
            onCancel={() => {
              setModalOpen(false);
              setEditingProgramacion(null);
            }}
          />
        </Modal>
      )}

      {cancelModalOpen && cancelTarget && (
        <Modal
          title={t("schedules.cancelTitle", { id: cancelTarget.id_programacion })}
          onClose={closeCancelModal}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{t("schedules.cancelDescription")}</p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              placeholder={t("schedules.cancelPlaceholder")}
              className="w-full rounded-xl border px-4 py-3"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCancelModal}
                className="rounded-xl border px-4 py-2"
                disabled={changingEstado}
              >
                {t("schedules.back")}
              </button>

              <button
                type="button"
                onClick={handleConfirmCancel}
                className="rounded-xl bg-red-600 px-4 py-2 text-white"
                disabled={changingEstado}
              >
                {changingEstado ? t("schedules.cancelling") : t("schedules.confirmCancel")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProgramacionesPage;
