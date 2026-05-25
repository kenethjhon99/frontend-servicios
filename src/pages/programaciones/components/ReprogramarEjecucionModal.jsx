import { useEffect, useState } from "react";
import Modal from "../../../components/common/Modal";
import { useI18n } from "../../../context/i18n.context";

const ReprogramarEjecucionModal = ({
  ejecucion,
  loading = false,
  error = "",
  onSubmit,
  onClose,
}) => {
  const { t } = useI18n();
  const [form, setForm] = useState({
    nueva_fecha: "",
    nueva_hora: "",
    motivo_reprogramacion: "",
    observaciones: "",
  });

  useEffect(() => {
    if (!ejecucion) return;
    setForm({
      nueva_fecha: ejecucion.fecha_reprogramada || "",
      nueva_hora: ejecucion.hora_programada || "",
      motivo_reprogramacion: "",
      observaciones: "",
    });
  }, [ejecucion]);

  if (!ejecucion) return null;

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      nueva_fecha: form.nueva_fecha,
      nueva_hora: form.nueva_hora || undefined,
      motivo_reprogramacion: form.motivo_reprogramacion,
      observaciones: form.observaciones || undefined,
    });
  };

  return (
    <Modal title={t("schedules.detail.reprogramTitle")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">{t("schedules.detail.reprogramDescription")}</p>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <label htmlFor="reprogramar-fecha" className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            {t("schedules.detail.newExecutionDate")}
          </span>
          <input
            id="reprogramar-fecha"
            type="date"
            value={form.nueva_fecha}
            onChange={(event) => handleChange("nueva_fecha", event.target.value)}
            className="rounded-xl border px-4 py-3 outline-none"
          />
        </label>

        <label htmlFor="reprogramar-hora" className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            {t("schedules.detail.newExecutionHour")}
          </span>
          <input
            id="reprogramar-hora"
            type="time"
            value={form.nueva_hora}
            onChange={(event) => handleChange("nueva_hora", event.target.value)}
            className="rounded-xl border px-4 py-3 outline-none"
          />
        </label>

        <label htmlFor="reprogramar-motivo" className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            {t("schedules.detail.rescheduleReasonRequired")}
          </span>
          <textarea
            id="reprogramar-motivo"
            rows={4}
            value={form.motivo_reprogramacion}
            onChange={(event) => handleChange("motivo_reprogramacion", event.target.value)}
            placeholder={t("schedules.detail.rescheduleReasonPlaceholder")}
            className="w-full rounded-xl border px-4 py-3 outline-none"
          />
        </label>

        <label htmlFor="reprogramar-observaciones" className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            {t("schedules.detail.executionNotes")}
          </span>
          <textarea
            id="reprogramar-observaciones"
            rows={3}
            value={form.observaciones}
            onChange={(event) => handleChange("observaciones", event.target.value)}
            placeholder={t("schedules.detail.executionNotesPlaceholder")}
            className="w-full rounded-xl border px-4 py-3 outline-none"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-4 py-2"
            disabled={loading}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-white"
            disabled={loading}
          >
            {loading ? t("common.processing") : t("schedules.detail.confirmReprogram")}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ReprogramarEjecucionModal;
