import { useCallback, useMemo, useRef, useState } from "react";
import { useI18n } from "./i18n.context";
import { ToastContext } from "./toast.context";

const TYPE_STYLES = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-slate-900 text-white",
  warning: "bg-yellow-500 text-slate-900",
};

const TYPE_ACCENTS = {
  success: "bg-white/30",
  error: "bg-white/30",
  info: "bg-white/25",
  warning: "bg-slate-900/20",
};

export const ToastProvider = ({ children }) => {
  const { t } = useI18n();
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, { type = "info", duration = 4000 } = {}) => {
      counterRef.current += 1;
      const id = counterRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }

      return id;
    },
    []
  );

  const api = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, options) => show(message, { ...options, type: "success" }),
      error: (message, options) => show(message, { ...options, type: "error" }),
      info: (message, options) => show(message, { ...options, type: "info" }),
      warning: (message, options) => show(message, { ...options, type: "warning" }),
    }),
    [show, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-enter pointer-events-auto relative overflow-hidden rounded-2xl px-4 py-3 text-sm shadow-lg ${
              TYPE_STYLES[toast.type] || TYPE_STYLES.info
            }`}
            role="status"
          >
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-1 ${
                TYPE_ACCENTS[toast.type] || TYPE_ACCENTS.info
              }`}
            />
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xs font-bold uppercase">
                {toast.type === "success"
                  ? "OK"
                  : toast.type === "error"
                    ? "!"
                    : toast.type === "warning"
                      ? "!"
                      : "i"}
              </span>
              <span className="flex-1 pt-1">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-md px-2 text-lg leading-none opacity-80 hover:opacity-100"
                aria-label={t("common.closeNotification")}
              >
                x
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
