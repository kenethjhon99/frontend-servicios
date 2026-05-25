import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Loader from "../components/common/Loader";
import ProtectedRoute from "../components/common/ProtectedRoute";
import RoleRoute from "../components/common/RoleRoute";
import AppLayout from "../components/layout/AppLayout";

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

const AgendaHoyPage = lazy(loadAgendaHoyPage);
const AgendaMensualPage = lazy(loadAgendaMensualPage);
const AgendaSemanalPage = lazy(loadAgendaSemanalPage);
const AuditoriaPage = lazy(loadAuditoriaPage);
const LoginPage = lazy(loadLoginPage);
const ClienteDetallePage = lazy(loadClienteDetallePage);
const ClientesPage = lazy(loadClientesPage);
const CotizacionDetallePage = lazy(loadCotizacionDetallePage);
const CotizacionesPage = lazy(loadCotizacionesPage);
const DashboardPage = lazy(loadDashboardPage);
const EmpleadosPage = lazy(loadEmpleadosPage);
const OrdenDetallePage = lazy(loadOrdenDetallePage);
const OrdenesPage = lazy(loadOrdenesPage);
const CreditosPage = lazy(loadCreditosPage);
const CobranzaPage = lazy(loadCobranzaPage);
const PagosPage = lazy(loadPagosPage);
const ProgramacionDetallePage = lazy(loadProgramacionDetallePage);
const ProgramacionesPage = lazy(loadProgramacionesPage);
const PropiedadesPage = lazy(loadPropiedadesPage);
const MiSeguridadPage = lazy(loadMiSeguridadPage);
const CategoriasPage = lazy(loadCategoriasPage);
const ServiciosPage = lazy(loadServiciosPage);
const UsuariosPage = lazy(loadUsuariosPage);

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
  if (!path) return;
  const matchedRoute = preloadersByRoute.find((item) => path.startsWith(item.match));
  return matchedRoute?.preload?.();
};

const fullScreenLoader = (
  <div className="flex min-h-screen items-center justify-center px-4">
    <div className="w-full max-w-md">
      <Loader />
    </div>
  </div>
);

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={fullScreenLoader}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/clientes/:id" element={<ClienteDetallePage />} />
              <Route path="/propiedades" element={<PropiedadesPage />} />
              <Route path="/categorias-servicio" element={<CategoriasPage />} />
              <Route path="/servicios" element={<ServiciosPage />} />
              <Route path="/agenda/hoy" element={<AgendaHoyPage />} />
              <Route path="/agenda/semanal" element={<AgendaSemanalPage />} />
              <Route path="/agenda/mensual" element={<AgendaMensualPage />} />
              <Route path="/programaciones" element={<ProgramacionesPage />} />
              <Route path="/programaciones/:id" element={<ProgramacionDetallePage />} />
              <Route path="/ordenes" element={<OrdenesPage />} />
              <Route path="/ordenes/:id" element={<OrdenDetallePage />} />
              <Route path="/pagos" element={<PagosPage />} />
              <Route path="/creditos" element={<CreditosPage />} />
              <Route path="/seguridad" element={<MiSeguridadPage />} />
              <Route path="/cuadrillas" element={<Navigate to="/empleados" replace />} />

              <Route element={<RoleRoute allowedRoles={["ADMIN", "SUPERVISOR", "COBRADOR"]} />}>
                <Route path="/cobranza" element={<CobranzaPage />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={["ADMIN", "SUPERVISOR"]} />}>
                <Route path="/empleados" element={<EmpleadosPage />} />
                <Route path="/cotizaciones" element={<CotizacionesPage />} />
                <Route path="/cotizaciones/:id" element={<CotizacionDetallePage />} />
                <Route path="/auditoria" element={<AuditoriaPage />} />
              </Route>

              <Route element={<RoleRoute allowedRoles={["ADMIN"]} />}>
                <Route path="/usuarios" element={<UsuariosPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRouter;
