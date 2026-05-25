import { useAuth } from "../../context/auth.context";
import { useI18n } from "../../context/i18n.context";

const ThemeBadge = ({ theme }) => (
  <span
    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-xl px-2 text-xs font-bold ${
      theme === "dark" ? "bg-amber-100 text-amber-700" : "bg-slate-900 text-white"
    }`}
  >
    {theme === "dark" ? "DAY" : "NIGHT"}
  </span>
);

const MenuIcon = () => (
  <span className="flex flex-col gap-1" aria-hidden="true">
    <span className="block h-0.5 w-5 rounded-full bg-current" />
    <span className="block h-0.5 w-5 rounded-full bg-current" />
    <span className="block h-0.5 w-5 rounded-full bg-current" />
  </span>
);

const Topbar = ({ title, theme, locale, onOpenMenu, onToggleTheme, onChangeLocale }) => {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  return (
    <header className="glass-panel sticky top-0 z-20 border-b border-white/60 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:px-5 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label={t("layout.openMenu")}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-700 shadow-sm"
          >
            <MenuIcon />
          </button>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl lg:text-[1.35rem]">
              {title}
            </h2>
            <p className="truncate text-sm text-slate-500 lg:text-[0.98rem]">
              {user?.nombre} - {user?.rol}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? t("layout.switchToLight") : t("layout.switchToDark")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3.5 text-sm font-medium text-slate-700 shadow-sm"
          >
            <ThemeBadge theme={theme} />
            <span className="hidden md:inline">
              {theme === "dark" ? t("layout.lightMode") : t("layout.darkMode")}
            </span>
          </button>

          <div className="inline-flex h-11 items-center gap-1 rounded-2xl border border-slate-200 bg-white/80 px-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => onChangeLocale("en")}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${locale === "en" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              aria-label={t("layout.language")}
            >
              {t("layout.langEnglish")}
            </button>
            <button
              type="button"
              onClick={() => onChangeLocale("es")}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${locale === "es" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              aria-label={t("layout.language")}
            >
              {t("layout.langSpanish")}
            </button>
          </div>

          <button
            onClick={logout}
            className="rounded-2xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {t("layout.signOut")}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
