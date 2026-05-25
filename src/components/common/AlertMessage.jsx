const stylesByVariant = {
  error: "bg-red-50 text-red-700 border-red-200",
  success: "bg-green-50 text-green-700 border-green-200",
  info: "bg-slate-50 text-slate-700 border-slate-200",
};

const AlertMessage = ({ message, variant = "error" }) => {
  if (!message) return null;

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${stylesByVariant[variant] || stylesByVariant.info}`}
    >
      {message}
    </div>
  );
};

export default AlertMessage;
