import { useI18n } from "../../context/i18n.context";

const Pagination = ({ pagination, onPageChange }) => {
  const { t, locale } = useI18n();

  if (!pagination) return null;

  const { page, limit, total, total_pages: totalPages } = pagination;

  if (!totalPages || totalPages <= 1) {
    return (
      <div className="flex items-center justify-end px-2 py-3 text-xs text-slate-500">
        {t("common.results", { count: total, suffix: total === 1 ? "" : "s" })}
      </div>
    );
  }

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const goTo = (next) => {
    if (next < 1 || next > totalPages || next === page) return;
    onPageChange?.(next);
  };

  return (
    <div className="flex flex-col items-center justify-between gap-2 px-2 py-3 text-xs text-slate-600 sm:flex-row">
      <span>
        {locale === "en" ? "Showing " : "Mostrando "}
        <strong>{from}</strong>-<strong>{to}</strong>
        {locale === "en" ? " of " : " de "}
        <strong>{total}</strong>
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goTo(1)}
          disabled={page === 1}
          className="rounded-lg border px-2 py-1 disabled:opacity-40"
          aria-label={t("common.firstPage")}
        >
          «
        </button>
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          className="rounded-lg border px-2 py-1 disabled:opacity-40"
          aria-label={t("common.previousPage")}
        >
          ‹
        </button>

        <span className="px-3">{t("common.pageOf", { page, totalPages })}</span>

        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages}
          className="rounded-lg border px-2 py-1 disabled:opacity-40"
          aria-label={t("common.nextPage")}
        >
          ›
        </button>
        <button
          type="button"
          onClick={() => goTo(totalPages)}
          disabled={page === totalPages}
          className="rounded-lg border px-2 py-1 disabled:opacity-40"
          aria-label={t("common.lastPage")}
        >
          »
        </button>
      </div>
    </div>
  );
};

export default Pagination;
