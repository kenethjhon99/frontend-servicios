import { useI18n } from "../../context/i18n.context";

const Loader = ({ text }) => {
  const { t } = useI18n();
  return (
    <div className="surface-card loader-pulse rounded-2xl bg-white p-6 text-sm text-slate-500">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 animate-pulse rounded-full bg-sky-500" />
        <span>{text || t("common.loading")}</span>
      </div>
    </div>
  );
};

export default Loader;
