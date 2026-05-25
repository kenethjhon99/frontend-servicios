import { useI18n } from "../../context/i18n.context";

const PdfButtonGroup = ({ onDownload, label = "PDF", className = "" }) => {
  const { t } = useI18n();
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => onDownload()}
        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
        title={t("common.clientLanguage")}
      >
        {t("common.pdf")} {label}
      </button>
      <button
        type="button"
        onClick={() => onDownload({ mode: "print" })}
        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
        title={t("common.print")}
      >
        {t("common.print")}
      </button>
      <button
        type="button"
        onClick={() => onDownload({ lang: "es" })}
        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
        title={t("common.forceSpanish")}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => onDownload({ lang: "en" })}
        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
        title={t("common.forceEnglish")}
      >
        EN
      </button>
    </div>
  );
};

export default PdfButtonGroup;
