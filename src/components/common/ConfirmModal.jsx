import Modal from "./Modal";
import { useI18n } from "../../context/i18n.context";

const ConfirmModal = ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmVariant = "danger",
  onConfirm,
  onClose,
  loading = false,
}) => {
  const { t } = useI18n();
  const resolvedConfirmLabel = confirmLabel || t("common.confirm");
  const resolvedCancelLabel = cancelLabel || t("common.close");
  const confirmClassName =
    confirmVariant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-slate-900 text-white hover:bg-slate-800";

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-5">
        <p className="text-sm text-slate-600">{message}</p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-4 py-2"
            disabled={loading}
          >
            {resolvedCancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 ${confirmClassName}`}
            disabled={loading}
          >
            {loading ? t("common.processing") : resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
