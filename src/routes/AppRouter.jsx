import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Loader from "../components/common/Loader";
import ProtectedRoute from "../components/common/ProtectedRoute";
import RoleRoute from "../components/common/RoleRoute";
import AppLayout from "../components/layout/AppLayout";
import { routeLoaders } from "./routePreload";

const {
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
} = routeLoaders;

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
