import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ roles, children }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page-loading">Cargando…</div>;
  if (!isAuthenticated) return <Navigate to="/staff/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.rol)) {
    return <div className="page-loading">No tienes permiso para ver esta sección.</div>;
  }
  return children;
}
