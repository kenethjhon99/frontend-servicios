import EmptyState from "../../../components/common/EmptyState";
import TableBase from "../../../components/common/TableBase";
import { useI18n } from "../../../context/i18n.context";

const badgeStyles = {
  PENDIENTE: "bg-amber-100 text-amber-700",
  GENERADA: "bg-sky-100 text-sky-700",
  COMPLETADA: "bg-green-100 text-green-700",
  REPROGRAMADA: "bg-violet-100 text-violet-700",
  CANCELADA: "bg-red-100 text-red-700",
};

const ProgramacionEjecucionesSection = ({
  ejecuciones = [],
  onReprogramar,
  onCancelar,
  onGenerarOrden,
  onVerOrden,
}) => {
  const { t } = useI18n();

  const columns = [
    { key: "fecha_programada", label: t("schedules.detail.executionDate") },
    {
      key: "hora_programada",
      label: t("schedules.detail.executionHour"),
      render: (row) => row.hora_programada || "-",
    },
    {
      key: "estado",
      label: t("schedules.detail.executionStatus"),
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
            badgeStyles[row.estado] || "bg-slate-100 text-slate-700"
          }`}
        >
          {t(`schedules.detail.executionStates.${row.estado}`)}
        </span>
      ),
    },
    {
      key: "fecha_reprogramada",
      label: t("schedules.detail.rescheduledTo"),
      render: (row) => row.fecha_reprogramada || "-",
    },
    {
      key: "motivo_reprogramacion",
      label: t("schedules.detail.rescheduleReason"),
      render: (row) => row.motivo_reprogramacion || "-",
    },
    {
      key: "motivo_cancelacion",
      label: t("schedules.detail.cancelReason"),
      render: (row) => row.motivo_cancelacion || "-",
    },
    {
      key: "id_orden_trabajo",
      label: t("schedules.detail.futureOrder"),
      render: (row) => (row.id_orden_trabajo ? `#${row.id_orden_trabajo}` : "-"),
    },
  ];

  if (!ejecuciones.length) {
    return (
      <EmptyState
        title={t("schedules.detail.noExecutionsTitle")}
        description={t("schedules.detail.noExecutionsDescription")}
      />
    );
  }

  return (
    <TableBase
      columns={columns}
      data={ejecuciones}
      renderActions={(row) => (
        <div className="flex flex-wrap gap-2">
          {row.estado === "PENDIENTE" && !row.id_orden_trabajo ? (
            <button
              type="button"
              onClick={() => onGenerarOrden(row)}
              className="rounded-lg border px-3 py-1.5 text-xs text-sky-700 hover:bg-sky-50"
            >
              {t("schedules.detail.generateOrder")}
            </button>
          ) : null}

          {row.id_orden_trabajo ? (
            <button
              type="button"
              onClick={() => onVerOrden?.(row)}
              className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
            >
              {t("schedules.detail.viewOrder")}
            </button>
          ) : null}

          {["PENDIENTE", "GENERADA"].includes(row.estado) && (
            <>
              <button
                type="button"
                onClick={() => onReprogramar(row)}
                className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
              >
                {t("schedules.detail.reprogram")}
              </button>

              <button
                type="button"
                onClick={() => onCancelar(row)}
                className="rounded-lg border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
              >
                {t("schedules.detail.cancelVisit")}
              </button>
            </>
          )}
        </div>
      )}
    />
  );
};

export default ProgramacionEjecucionesSection;
