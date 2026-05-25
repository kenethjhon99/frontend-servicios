import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/auth.context";
import { useI18n } from "../../context/i18n.context";
import { preloadRouteChunk } from "../../routes/AppRouter";
import { menuByRole } from "../../utils/permissions";

const ICON_BY_PATH = {
  "/": (
    <path
      d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  ),
  "/clientes": (
    <>
      <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4.5 19c.8-2.7 3.1-4 6-4s5.2 1.3 6 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M15 18c.5-1.8 2-2.8 4-2.8 1.1 0 2.1.3 2.9.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </>
  ),
  "/propiedades": (
    <>
      <path
        d="M4 20V10.5L12 4l8 6.5V20"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9 20v-5h6v5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </>
  ),
  "/categorias-servicio": (
    <>
      <rect x="4" y="5" width="7" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="5" width="7" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="13" width="7" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="7" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  "/servicios": (
    <>
      <path
        d="M5 18 18 5M14 4h6v6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M4 10c0-2 1.6-3.6 3.6-3.6.7 0 1.3.2 1.9.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </>
  ),
  "/empleados": (
    <>
      <circle cx="12" cy="8" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 20c.9-3.1 3.4-4.7 6.5-4.7S17.6 16.9 18.5 20"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </>
  ),
  "/programaciones": (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4M4 10h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="m9 14 2 2 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </>
  ),
  "/cotizaciones": (
    <>
      <path
        d="M7 4h7l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M14 4v4h4M9 12h6M9 16h6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </>
  ),
  "/ordenes": (
    <>
      <path
        d="M8 6h10l1.5 3H21v2.5h-1.5l-1 5H6.5l-1-5H4V9h1.5L7 6Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M9 11h6M9 15h4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </>
  ),
  "/pagos": (
    <>
      <path
        d="M5 7h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </>
  ),
  "/creditos": (
    <>
      <path
        d="M12 4v16M7.5 8.5c0-1.4 1.2-2.5 2.7-2.5h3.2c1.4 0 2.6 1 2.6 2.3 0 3.3-8.5 1.8-8.5 5.9 0 1.3 1.1 2.4 2.5 2.4h3.8c1.5 0 2.7-1.1 2.7-2.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </>
  ),
  "/cobranza": (
    <>
      <path
        d="M6 7.5h12a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9.5a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9 12h6M10.2 15.2h3.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M8 5.5h8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </>
  ),
  "/agenda/hoy": (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4M4 10h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M12 13v3M12 13h2.4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </>
  ),
  "/agenda/semanal": (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4M4 10h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M7 14h10M7 17h6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </>
  ),
  "/agenda/mensual": (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4M4 10h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M8 14h2M12 14h2M16 14h0M8 17h2M12 17h2M16 17h0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </>
  ),
  "/auditoria": (
    <>
      <path
        d="M12 4 5 7v5c0 4 2.8 7 7 8 4.2-1 7-4 7-8V7l-7-3Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="m9.5 12 1.8 1.8 3.6-3.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </>
  ),
  "/usuarios": (
    <>
      <circle cx="9" cy="8.5" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="7.5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4.8 18.5c.8-2.4 2.8-3.6 5.3-3.6 2.6 0 4.5 1.2 5.3 3.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M15.4 17.5c.5-1.5 1.7-2.3 3.2-2.3 1 0 1.9.2 2.6.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </>
  ),
  "/seguridad": (
    <>
      <path
        d="M12 3.8 5.5 6.4v5.4c0 4 2.6 6.8 6.5 8.3 3.9-1.5 6.5-4.3 6.5-8.3V6.4L12 3.8Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <rect x="9.4" y="11" width="5.2" height="4.6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.4 11v-1a1.6 1.6 0 0 1 3.2 0v1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </>
  ),
};

const NavIcon = ({ path }) => (
  <svg
    viewBox="0 0 24 24"
    width="23"
    height="23"
    aria-hidden="true"
  >
    {ICON_BY_PATH[path] || ICON_BY_PATH["/"]}
  </svg>
);

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const items = menuByRole[user?.rol] || [];

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className="glass-panel soft-scrollbar fixed left-0 top-0 z-50 flex h-screen w-[min(78vw,20rem)] max-w-[20rem] flex-col border-r border-white/50 transition-transform duration-300"
        style={{
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          boxShadow: "22px 0 55px rgba(15,23,42,0.18)",
        }}
      >
        <div className="border-b border-white/50 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500 p-[1px] shadow-lg">
              <div className="rounded-2xl bg-white/90 px-4 py-3">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  {t("app.name")}
                </h1>
                <p className="text-sm text-slate-500">{t("app.tagline")}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={t("layout.closeMenu")}
              className="rounded-2xl border border-slate-200 bg-white/85 px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm"
            >
              {t("common.close")}
            </button>
          </div>

          <div className="rounded-2xl bg-slate-900 px-4 py-3.5 text-white shadow-lg">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-300">{t("layout.activeSession")}</p>
            <p className="mt-2 text-base font-semibold">{user?.nombre || t("app.name")}</p>
            <p className="text-sm text-slate-300">{user?.rol || t("layout.noRole")}</p>
          </div>
        </div>

        <nav className="soft-scrollbar flex-1 space-y-2.5 overflow-y-auto p-4">
          {items.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              onMouseEnter={() => preloadRouteChunk(item.path)}
              onFocus={() => preloadRouteChunk(item.path)}
              onTouchStart={() => preloadRouteChunk(item.path)}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[0.98rem] font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-lg"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
              style={{ animationDelay: `${Math.min(index * 34, 240)}ms` }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-all duration-200 ${
                      isActive
                        ? "bg-white/18 text-white"
                        : "bg-slate-900 text-white group-hover:scale-105"
                    }`}
                    style={{ width: "2.9rem", height: "2.9rem" }}
                  >
                    <NavIcon path={item.path} />
                  </span>
                  <span className="leading-tight">{t(item.labelKey)}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
