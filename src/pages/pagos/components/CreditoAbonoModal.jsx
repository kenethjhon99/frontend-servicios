import AlertMessage from "../../../components/common/AlertMessage";
import Modal from "../../../components/common/Modal";
import { useI18n } from "../../../context/i18n.context";
import { formatCurrency } from "../../../utils/currency";

const CreditoAbonoModal = ({
  credito,
  form,
  error = "",
  loading = false,
  onChange,
  onClose,
  onSubmit,
}) => {
  const { t } = useI18n();

  if (!credito) return null;

  return (
    <Modal title={t("credits.paymentModalTitle", { id: credito.id_credito })} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {t("credits.currentBalance", {
            value: formatCurrency(credito.saldo_pendiente),
          })}
        </p>

        <AlertMessage message={error} />

        <select
          name="metodo_pago"
          value={form.metodo_pago}
          onChange={onChange}
          className="w-full rounded-xl border px-4 py-3"
        >
          <option value="EFECTIVO">EFECTIVO</option>
          <option value="TRANSFERENCIA">TRANSFERENCIA</option>
          <option value="CHEQUE">CHEQUE</option>
          <option value="DEPOSITO">DEPOSITO</option>
          <option value="TARJETA">TARJETA</option>
          <option value="OTRO">OTRO</option>
        </select>

        <input
          name="monto"
          type="number"
          value={form.monto}
          onChange={onChange}
          placeholder={t("credits.amountPlaceholder")}
          className="w-full rounded-xl border px-4 py-3"
        />

        <input
          name="referencia_pago"
          value={form.referencia_pago}
          onChange={onChange}
          placeholder={t("credits.referencePlaceholder")}
          className="w-full rounded-xl border px-4 py-3"
        />

        <textarea
          name="observaciones"
          value={form.observaciones}
          onChange={onChange}
          rows={3}
          placeholder={t("credits.notesPlaceholder")}
          className="w-full rounded-xl border px-4 py-3"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-4 py-2"
            disabled={loading}
          >
            {t("common.close")}
          </button>

          <button
            type="button"
            onClick={onSubmit}
            className="rounded-xl bg-slate-900 px-4 py-2 text-white"
            disabled={loading}
          >
            {loading ? t("credits.applyingPayment") : t("credits.applyPayment")}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreditoAbonoModal;
