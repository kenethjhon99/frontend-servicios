import { Outlet, useLocation } from "react-router-dom";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../context/i18n.context";
import Loader from "../common/Loader";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const ROUTE_TITLE_KEYS = [
  { match: "/clientes", key: "routes.clients" },
  { match: "/propiedades", key: "routes.properties" },
  { match: "/categorias-servicio", key: "routes.categories" },
  { match: "/servicios", key: "routes.services" },
  { match: "/usuarios", key: "routes.users" },
  { match: "/empleados", key: "routes.employees" },
  { match: "/programaciones", key: "routes.schedules" },
  { match: "/cotizaciones", key: "routes.quotes" },
  { match: "/ordenes", key: "routes.orders" },
  { match: "/pagos", key: "routes.payments" },
  { match: "/creditos", key: "routes.credits" },
  { match: "/cobranza", key: "routes.collections" },
  { match: "/seguridad", key: "routes.security" },
  { match: "/agenda/mensual", key: "routes.agendaMonthly" },
  { match: "/agenda/semanal", key: "routes.agendaWeekly" },
  { match: "/agenda/hoy", key: "routes.agendaToday" },
  { match: "/auditoria", key: "routes.audit" },
];

const AppLayout = () => {
  const location = useLocation();
  const { t, locale, setLocale } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";

    const storedTheme = window.localStorage.getItem("codanova-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
    window.localStorage.setItem("codanova-theme", theme);
  }, [theme]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const topbarTitle = useMemo(() => {
    const match = ROUTE_TITLE_KEYS.find((item) => location.pathname.startsWith(item.match));
    return match ? t(match.key) : t("routes.dashboard");
  }, [location.pathname, t]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className="min-h-screen bg-transparent">
      {sidebarOpen ? <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} /> : null}
      <div className="flex min-h-screen flex-col">
        <Topbar
          title={topbarTitle}
          theme={theme}
          locale={locale}
          onOpenMenu={() => setSidebarOpen(true)}
          onToggleTheme={toggleTheme}
          onChangeLocale={setLocale}
        />
        <main className="page-enter px-4 py-5 sm:px-5 sm:py-6 lg:px-6 lg:py-6">
          <Suspense fallback={<Loader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
