import { useI18n } from "../../context/i18n.context";

const EmptyState = ({
  title,
  description,
}) => {
  const { t } = useI18n();
  return (
    <div className="surface-card rounded-[1.75rem] border-dashed bg-white p-6 text-center lg:p-7">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-sky-100 text-sky-700 shadow-sm">
        <svg viewBox="0 0 24 24" width="28" height="28" className="h-7 w-7" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 8v5M12 16h0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-800 lg:text-xl">
        {title || t("common.noDataTitle")}
      </h3>
      <p className="mx-auto mt-2.5 max-w-xl text-sm text-slate-500">
        {description || t("common.noDataDescription")}
      </p>
    </div>
  );
};

export default EmptyState;
