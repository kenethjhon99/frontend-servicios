import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/auth.context";

const RoleRoute = ({ allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.rol)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;