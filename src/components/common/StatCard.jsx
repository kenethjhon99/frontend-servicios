const getIcon = (title) => {
  const normalized = title.toLowerCase();

  if (normalized.includes("ingresos") || normalized.includes("pagos")) {
    return (
      <path
        d="M12 4v16M8 8.5c0-1.4 1.2-2.5 2.7-2.5h2.7c1.5 0 2.6 1 2.6 2.3 0 3.3-8 1.7-8 5.8 0 1.4 1.2 2.5 2.7 2.5h2.8c1.5 0 2.7-1.1 2.7-2.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    );
  }

  if (normalized.includes("alerta")) {
    return (
      <>
        <path
          d="M12 4 4.5 18h15L12 4Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path d="M12 9.5v3.5M12 16h0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </>
    );
  }

  if (normalized.includes("cliente")) {
    return (
      <>
        <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6 19c.9-2.9 3.4-4.4 6-4.4s5.1 1.5 6 4.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </>
    );
  }

  if (normalized.includes("credito")) {
    return (
      <>
        <rect x="4" y="6.5" width="16" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7.5 12h3M13.5 12h3" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      </>
    );
  }

  return (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4M4 10h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="m9 14 2 2 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </>
  );
};

const buildSparklinePath = (values = []) => {
  if (!values.length) return "";
  const max = Math.max(...values, 1);
  const stepX = values.length === 1 ? 0 : 100 / (values.length - 1);
  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = 26 - (Number(value || 0) / max) * 22;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
};

const trendClassByDirection = {
  up: "bg-emerald-100 text-emerald-700",
  down: "bg-amber-100 text-amber-700",
  flat: "bg-slate-100 text-slate-600",
};

const trendLabelByDirection = {
  up: "Sube",
  down: "Baja",
  flat: "Estable",
};

const StatCard = ({ title, value, trendLabel = "", trendDirection = "flat", sparklineValues = [] }) => {
  const sparklinePath = buildSparklinePath(sparklineValues);

  return (
    <div className="surface-card rounded-[1.75rem] bg-white p-5 transition-transform duration-200 hover:-translate-y-1">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 lg:text-[1.9rem]">
            {value}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                trendClassByDirection[trendDirection] || trendClassByDirection.flat
              }`}
            >
              {trendLabelByDirection[trendDirection] || trendLabelByDirection.flat}
            </span>
            {trendLabel ? <span className="text-xs text-slate-500">{trendLabel}</span> : null}
          </div>
        </div>

        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-sm">
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            {getIcon(title)}
          </svg>
        </span>
      </div>

      {sparklinePath ? (
        <div className="mt-4 overflow-hidden rounded-2xl bg-slate-50/90 px-3 py-2">
          <svg viewBox="0 0 100 30" className="h-10 w-full" preserveAspectRatio="none">
            <path d="M0 28 H100" fill="none" stroke="rgba(148, 163, 184, 0.28)" strokeDasharray="3 3" strokeWidth="0.8" />
            <path d={sparklinePath} fill="none" stroke="#0ea5e9" strokeWidth="2.4" />
          </svg>
        </div>
      ) : null}
    </div>
  );
};

export default StatCard;
