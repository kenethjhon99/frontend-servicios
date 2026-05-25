const loadAgendaHoyPage = () => import("../pages/agenda/AgendaHoyPage");
const loadAgendaMensualPage = () => import("../pages/agenda/AgendaMensualPage");
const loadAgendaSemanalPage = () => import("../pages/agenda/AgendaSemanalPage");
const loadAuditoriaPage = () => import("../pages/auditoria/AuditoriaPage");
const loadLoginPage = () => import("../pages/auth/LoginPage");
const loadClienteDetallePage = () => import("../pages/clientes/ClienteDetallePage");
const loadClientesPage = () => import("../pages/clientes/ClientesPage");
const loadCotizacionDetallePage = () => import("../pages/cotizaciones/CotizacionDetallePage");
const loadCotizacionesPage = () => import("../pages/cotizaciones/CotizacionesPage");
const loadDashboardPage = () => import("../pages/dashboard/DashboardPage");
const loadEmpleadosPage = () => import("../pages/empleados/EmpleadosPage");
const loadOrdenDetallePage = () => import("../pages/ordenes/OrdenDetallePage");
const loadOrdenesPage = () => import("../pages/ordenes/OrdenesPage");
const loadCreditosPage = () => import("../pages/pagos/CreditosPage");
const loadCobranzaPage = () => import("../pages/pagos/CobranzaPage");
const loadPagosPage = () => import("../pages/pagos/PagosPage");
const loadProgramacionDetallePage = () => import("../pages/programaciones/ProgramacionDetallePage");
const loadProgramacionesPage = () => import("../pages/programaciones/ProgramacionesPage");
const loadPropiedadesPage = () => import("../pages/propiedades/PropiedadesPage");
const loadMiSeguridadPage = () => import("../pages/seguridad/MiSeguridadPage");
const loadCategoriasPage = () => import("../pages/servicios/CategoriasPage");
const loadServiciosPage = () => import("../pages/servicios/ServiciosPage");
const loadUsuariosPage = () => import("../pages/usuarios/UsuariosPage");

export const routeLoaders = {
  loadAgendaHoyPage,
  loadAgendaMensualPage,
  loadAgendaSemanalPage,
  loadAuditoriaPage,
  loadLoginPage,
  loadClienteDetallePage,
  loadClientesPage,
  loadCotizacionDetallePage,
  loadCotizacionesPage,
  loadDashboardPage,
  loadEmpleadosPage,
  loadOrdenDetallePage,
  loadOrdenesPage,
  loadCreditosPage,
  loadCobranzaPage,
  loadPagosPage,
  loadProgramacionDetallePage,
  loadProgramacionesPage,
  loadPropiedadesPage,
  loadMiSeguridadPage,
  loadCategoriasPage,
  loadServiciosPage,
  loadUsuariosPage,
};

const preloadersByRoute = [
  { match: "/clientes/", preload: loadClienteDetallePage },
  { match: "/clientes", preload: loadClientesPage },
  { match: "/propiedades", preload: loadPropiedadesPage },
  { match: "/categorias-servicio", preload: loadCategoriasPage },
  { match: "/servicios", preload: loadServiciosPage },
  { match: "/agenda/mensual", preload: loadAgendaMensualPage },
  { match: "/agenda/semanal", preload: loadAgendaSemanalPage },
  { match: "/agenda/hoy", preload: loadAgendaHoyPage },
  { match: "/programaciones/", preload: loadProgramacionDetallePage },
  { match: "/programaciones", preload: loadProgramacionesPage },
  { match: "/ordenes/", preload: loadOrdenDetallePage },
  { match: "/ordenes", preload: loadOrdenesPage },
  { match: "/pagos", preload: loadPagosPage },
  { match: "/creditos", preload: loadCreditosPage },
  { match: "/cobranza", preload: loadCobranzaPage },
  { match: "/seguridad", preload: loadMiSeguridadPage },
  { match: "/empleados", preload: loadEmpleadosPage },
  { match: "/cotizaciones/", preload: loadCotizacionDetallePage },
  { match: "/cotizaciones", preload: loadCotizacionesPage },
  { match: "/auditoria", preload: loadAuditoriaPage },
  { match: "/usuarios", preload: loadUsuariosPage },
  { match: "/login", preload: loadLoginPage },
  { match: "/", preload: loadDashboardPage },
];

export const preloadRouteChunk = (path) => {
  if (!path) return undefined;
  const matchedRoute = preloadersByRoute.find((item) => path.startsWith(item.match));
  return matchedRoute?.preload?.();
};
