import { useEffect } from "react";
import { useI18n } from "../../context/i18n.context";

const Modal = ({ title, children, onClose }) => {
  const { t } = useI18n();
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
      style={{ animation: "backdrop-in 180ms ease-out" }}
      onClick={onClose}
    >
      <div
        className="flex min-h-full items-start justify-center"
        style={{ paddingTop: "0.5rem", paddingBottom: "0.5rem" }}
      >
        <div
          className="surface-card flex min-h-0 w-full max-w-[min(96vw,58rem)] flex-col rounded-2xl bg-white"
          style={{
            animation: "modal-in 220ms ease-out",
            maxHeight: "calc(100dvh - 1rem)",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-slate-200/70 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white/80 px-3 py-1 text-sm shadow-sm"
              >
                {t("common.close")}
              </button>
            </div>
          </div>

          <div
            className="soft-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"
            style={{
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
