import { useI18n } from "../../context/i18n.context";

const StepIcon = ({ complete, active }) => (
  <span
    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
      complete
        ? "border-emerald-200 bg-emerald-100 text-emerald-700"
        : active
          ? "border-sky-200 bg-sky-100 text-sky-700"
          : "border-slate-200 bg-slate-100 text-slate-500"
    }`}
  >
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      {complete ? (
        <path
          d="m7.5 12.5 3 3 6-7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      ) : (
        <circle cx="12" cy="12" r="3.25" fill="currentColor" />
      )}
    </svg>
  </span>
);

const FormProgress = ({ title, description, steps = [], activeIndex = 0, onStepChange }) => {
  const { t } = useI18n();
  const completed = steps.filter((step) => step.complete).length;

  return (
    <section className="surface-card rounded-[1.75rem] bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            {t("common.guidedFlow")}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
        </div>

        <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-300">{t("common.progress")}</p>
          <p className="mt-1 text-2xl font-semibold">
            {completed}/{steps.length}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const active = index === activeIndex;

          return (
            <button
              key={step.label}
              type="button"
              onClick={() => onStepChange?.(index)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                step.complete
                  ? "border-emerald-200 bg-emerald-50/80"
                  : active
                    ? "border-sky-200 bg-sky-50/80"
                    : "border-slate-200 bg-slate-50/80"
              }`}
            >
              <div className="flex items-start gap-3">
                <StepIcon complete={step.complete} active={active} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                  <p className="text-xs text-slate-500">{step.hint}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default FormProgress;
