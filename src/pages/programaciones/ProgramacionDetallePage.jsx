import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  cancelarEjecucionProgramacionRequest,
  generarEjecucionProgramacionRequest,
  generarOrdenDesdeEjecucionProgramacionRequest,
  getProgramacionByIdRequest,
  getProgramacionEjecucionesRequest,
  reprogramarEjecucionProgramacionRequest,
} from "../../api/programaciones.api";
import AlertMessage from "../../components/common/AlertMessage";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import StatCard from "../../components/common/StatCard";
import { useI18n } from "../../context/i18n.context";
import { useToast } from "../../context/toast.context";
import { extractApiError } from "../../lib/api";
import { formatCurrency } from "../../utils/currency";
import ProgramacionEjecucionesSection from "./components/ProgramacionEjecucionesSection";
import ReprogramarEjecucionModal from "./components/ReprogramarEjecucionModal";

const statusBadgeStyles = {
  ACTIVA: "bg-green-100 text-green-700",
  PAUSADA: "bg-amber-100 text-amber-700",
  FINALIZADA: "bg-slate-100 text-slate-700",
  CANCELADA: "bg-red-100 text-red-700",
};

const ProgramacionDetallePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const toast = useToast();

  const [programacion, setProgramacion] = useState(null);
  const [ejecuciones, setEjecuciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [reprogramTarget, setReprogramTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const loadDetalle = async () => {
    try {
      setLoading(true);
      setError("");

      const [programacionData, ejecucionesData] = await Promise.all([
        getProgramacionByIdRequest(id),
        getProgramacionEjecucionesRequest(id),
      ]);

      setProgramacion(programacionData);
      setEjecuciones(ejecucionesData);
    } catch (requestError) {
      setError(extractApiError(requestError, t("schedules.detail.loadError")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetalle();
  }, [id]);

  const resumenCards = useMemo(() => {
    if (!programacion) return [];

    return [
      { title: t("schedules.frequency"), value: programacion.frecuencia || "-" },
      { title: t("schedules.nextDate"), value: programacion.proxima_fecha || "-" },
      { title: t("schedules.hour"), value: programacion.hora_programada || "-" },
      {
        title: t("schedules.price"),
        value: formatCurrency(programacion.precio_acordado || 0),
      },
    ];
  }, [programacion, t]);

  const handleGenerateVisit = async () => {
    try {
      setActionLoading(true);
      setError("");
      await generarEjecucionProgramacionRequest(id);
      toast.success(t("schedules.detail.generateSuccess"));
      await loadDetalle();
    } catch (requestError) {
      const message = extractApiError(requestError, t("schedules.detail.generateError"));
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerarOrden = async (ejecucion) => {
    try {
      setActionLoading(true);
      setError("");
      await generarOrdenDesdeEjecucionProgramacionRequest(ejecucion.id_ejecucion);
      toast.success(t("schedules.detail.generateOrderSuccess"));
      await loadDetalle();
    } catch (requestError) {
      const message = extractApiError(
        requestError,
        t("schedules.detail.generateOrderError")
      );
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReprogram = async (payload) => {
    try {
      setActionLoading(true);
      setModalError("");
      await reprogramarEjecucionProgramacionRequest(reprogramTarget.id_ejecucion, payload);
      setReprogramTarget(null);
      toast.success(t("schedules.detail.reprogramSuccess"));
      await loadDetalle();
    } catch (requestError) {
      const message = extractApiError(requestError, t("schedules.detail.reprogramError"));
      setModalError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelVisit = async () => {
    if (!cancelReason.trim() || !cancelTarget) {
      setModalError(t("schedules.detail.cancelVisitReasonRequired"));
      return;
    }

    try {
      setActionLoading(true);
      setModalError("");
      await cancelarEjecucionProgramacionRequest(cancelTarget.id_ejecucion, {
        motivo_cancelacion: cancelReason.trim(),
      });
      setCancelTarget(null);
      setCancelReason("");
      toast.success(t("schedules.detail.cancelVisitSuccess"));
      await loadDetalle();
    } catch (requestError) {
      const message = extractApiError(requestError, t("schedules.detail.cancelVisitError"));
      setModalError(message);
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <Loader text={t("schedules.detail.loading")} />;
  }

  if (error && !programacion) {
    return (
      <div className="space-y-4">
        <AlertMessage message={error} />
        <EmptyState
          title={t("schedules.detail.noInfoTitle")}
          description={t("schedules.detail.noInfoDescription")}
        />
      </div>
    );
  }

  if (!programacion) {
    return (
      <EmptyState
        title={t("schedules.detail.noInfoTitle")}
        description={t("schedules.detail.noInfoDescription")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate("/programaciones")}
            className="mb-2 rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
          >
            {t("schedules.back")}
          </button>
          <h1 className="text-2xl font-bold">
            {t("schedules.detail.title", { id: programacion.id_programacion })}
          </h1>
          <p className="text-sm text-slate-500">{t("schedules.detail.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              statusBadgeStyles[programacion.estado] || "bg-slate-100 text-slate-700"
            }`}
          >
            {programacion.estado}
          </span>
          <button
            type="button"
            onClick={handleGenerateVisit}
            disabled={actionLoading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {actionLoading ? t("common.processing") : t("schedules.detail.generateVisit")}
          </button>
        </div>
      </div>

      <AlertMessage message={error} />

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("schedules.client")}</p>
            <p className="font-medium">{programacion.cliente}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("schedules.property")}</p>
            <p className="font-medium">{programacion.nombre_propiedad}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("schedules.service")}</p>
            <p className="font-medium">{programacion.servicio}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("schedules.owner")}</p>
            <p className="font-medium">
              {programacion.empleado_responsable || t("schedules.detail.unassignedOwner")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {resumenCards.map((card) => (
            <StatCard key={card.title} title={card.title} value={card.value} />
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("schedules.priority")}</p>
            <p className="font-medium">{programacion.prioridad}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("schedules.detail.duration")}</p>
            <p className="font-medium">
              {programacion.duracion_estimada_min
                ? `${programacion.duracion_estimada_min} min`
                : "-"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t("schedules.detail.priceDescription")}</p>
            <p className="font-medium">{programacion.descripcion_precio || "-"}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">{t("schedules.detail.notes")}</p>
          <p className="mt-1 text-sm text-slate-700">
            {programacion.observaciones || t("schedules.detail.noNotes")}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">{t("schedules.detail.executionsTitle")}</h2>
          <p className="text-sm text-slate-500">{t("schedules.detail.executionsDescription")}</p>
        </div>

        <ProgramacionEjecucionesSection
          ejecuciones={ejecuciones}
          onGenerarOrden={handleGenerarOrden}
          onVerOrden={(row) => navigate(`/ordenes/${row.id_orden_trabajo}`)}
          onReprogramar={(row) => {
            setModalError("");
            setReprogramTarget(row);
          }}
          onCancelar={(row) => {
            setModalError("");
            setCancelReason("");
            setCancelTarget(row);
          }}
        />
      </section>

      {reprogramTarget ? (
        <ReprogramarEjecucionModal
          ejecucion={reprogramTarget}
          loading={actionLoading}
          error={modalError}
          onClose={() => {
            setModalError("");
            setReprogramTarget(null);
          }}
          onSubmit={handleSubmitReprogram}
        />
      ) : null}

      {cancelTarget ? (
        <Modal
          title={t("schedules.detail.cancelVisitTitle")}
          onClose={() => {
            setModalError("");
            setCancelTarget(null);
            setCancelReason("");
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{t("schedules.detail.cancelVisitDescription")}</p>

            {modalError ? <AlertMessage message={modalError} /> : null}

            <textarea
              rows={4}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder={t("schedules.detail.cancelVisitPlaceholder")}
              className="w-full rounded-xl border px-4 py-3"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalError("");
                  setCancelTarget(null);
                  setCancelReason("");
                }}
                className="rounded-xl border px-4 py-2"
                disabled={actionLoading}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleCancelVisit}
                className="rounded-xl bg-red-600 px-4 py-2 text-white"
                disabled={actionLoading}
              >
                {actionLoading ? t("common.processing") : t("schedules.detail.confirmCancelVisit")}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
};

export default ProgramacionDetallePage;
