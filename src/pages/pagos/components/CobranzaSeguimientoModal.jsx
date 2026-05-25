import AlertMessage from "../../../components/common/AlertMessage";
import Modal from "../../../components/common/Modal";
import { useI18n } from "../../../context/i18n.context";
import { formatCurrency } from "../../../utils/currency";

const medios = ["LLAMADA", "WHATSAPP", "CORREO", "VISITA", "OTRO"];
const resultados = [
  "PENDIENTE",
  "SIN_RESPUESTA",
  "PROMESA_PAGO",
  "ABONO_REALIZADO",
  "REAGENDADO",
  "DISPUTA",
  "RECORDATORIO",
];

const CobranzaSeguimientoModal = ({
  target,
  form,
  responsables = [],
  error = "",
  loading = false,
  onChange,
  onClose,
  onSubmit,
}) => {
  const { t } = useI18n();

  if (!target) return null;

  return (
    <Modal
      title={t("collections.followUp.modalTitle", {
        client: target.cliente,
      })}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="font-medium text-slate-900">{target.cliente}</p>
          <p className="mt-1">
            {t("collections.followUp.modalHint", {
              balance: formatCurrency(target.saldo_pendiente_total ?? target.saldo_pendiente ?? 0),
            })}
          </p>
        </div>

        <AlertMessage message={error} />

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">{t("collections.followUp.contactMethod")}</span>
            <select
              name="medio_contacto"
              value={form.medio_contacto}
              onChange={onChange}
              className="rounded-xl border px-4 py-3"
            >
              {medios.map((medio) => (
                <option key={medio} value={medio}>
                  {t(`collections.followUp.methods.${medio}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">{t("collections.followUp.result")}</span>
            <select
              name="resultado"
              value={form.resultado}
              onChange={onChange}
              className="rounded-xl border px-4 py-3"
            >
              {resultados.map((resultado) => (
                <option key={resultado} value={resultado}>
                  {t(`collections.followUp.results.${resultado}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs text-slate-500">{t("collections.followUp.owner")}</span>
            <select
              name="id_usuario_responsable"
              value={form.id_usuario_responsable}
              onChange={onChange}
              className="rounded-xl border px-4 py-3"
            >
              <option value="">{t("collections.followUp.selectOwner")}</option>
              {responsables.map((responsable) => (
                <option key={responsable.id_usuario} value={responsable.id_usuario}>
                  {responsable.nombre || responsable.username || responsable.correo}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">{t("collections.followUp.date")}</span>
            <input
              type="date"
              name="fecha_seguimiento"
              value={form.fecha_seguimiento}
              onChange={onChange}
              className="rounded-xl border px-4 py-3"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">{t("collections.followUp.nextContact")}</span>
            <input
              type="date"
              name="proximo_contacto"
              value={form.proximo_contacto}
              onChange={onChange}
              className="rounded-xl border px-4 py-3"
            />
          </label>
        </div>

        <textarea
          name="notas"
          value={form.notas}
          onChange={onChange}
          rows={4}
          placeholder={t("collections.followUp.notesPlaceholder")}
          className="w-full rounded-xl border px-4 py-3"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border px-4 py-2"
          >
            {t("common.close")}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-white"
          >
            {loading ? t("common.saving") : t("collections.followUp.save")}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CobranzaSeguimientoModal;
