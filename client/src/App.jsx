import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

const Catalogo = lazy(() => import('./pages/Catalogo.jsx'));
const DetalleClase = lazy(() => import('./pages/DetalleClase.jsx'));
const ReservaConfirmada = lazy(() => import('./pages/ReservaConfirmada.jsx'));
const MiQr = lazy(() => import('./pages/MiQr.jsx'));
const StaffLogin = lazy(() => import('./pages/staff/Login.jsx'));
const StaffCheckin = lazy(() => import('./pages/staff/Checkin.jsx'));
const StaffAgendaHoy = lazy(() => import('./pages/staff/AgendaHoy.jsx'));
const AdminCoaches = lazy(() => import('./pages/admin/Coaches.jsx'));
const AdminClases = lazy(() => import('./pages/admin/Clases.jsx'));
const AdminUsuarios = lazy(() => import('./pages/admin/Usuarios.jsx'));
const StaffClientes = lazy(() => import('./pages/staff/Clientes.jsx'));

function Topbar() {
  const { isAuthenticated, user, signOut } = useAuth();
  return (
    <header className="topbar">
      <NavLink to="/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
        Oxygen Wellness Center
      </NavLink>
      <nav>
        {isAuthenticated ? (
          <>
            <NavLink to="/staff/agenda">Agenda</NavLink>
            <NavLink to="/staff/checkin">Check-in</NavLink>
            {(user.rol === 'administrador' || user.rol === 'recepcion') && <NavLink to="/staff/clientes">Clientes</NavLink>}
            {user.rol === 'administrador' && <NavLink to="/admin/clases">Admin</NavLink>}
            <span className="pill accent">{user.nombre}</span>
            <a href="#" onClick={(e) => { e.preventDefault(); signOut(); }}>Salir</a>
          </>
        ) : (
          <NavLink to="/staff/login">Acceso staff</NavLink>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="shell">
          <Topbar />
          <main>
            <Suspense fallback={<div className="page-loading">Cargando…</div>}>
              <Routes>
                <Route path="/" element={<Catalogo />} />
                <Route path="/clase/:id" element={<DetalleClase />} />
                <Route path="/reserva-confirmada/:qrToken" element={<ReservaConfirmada />} />
                <Route path="/mi-qr/:qrToken" element={<MiQr />} />

                <Route path="/staff/login" element={<StaffLogin />} />
                <Route
                  path="/staff/checkin"
                  element={
                    <ProtectedRoute>
                      <StaffCheckin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/staff/agenda"
                  element={
                    <ProtectedRoute>
                      <StaffAgendaHoy />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/coaches"
                  element={
                    <ProtectedRoute roles={['administrador']}>
                      <AdminCoaches />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clases"
                  element={
                    <ProtectedRoute roles={['administrador']}>
                      <AdminClases />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/usuarios"
                  element={
                    <ProtectedRoute roles={['administrador']}>
                      <AdminUsuarios />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/staff/clientes"
                  element={
                    <ProtectedRoute roles={['administrador', 'recepcion']}>
                      <StaffClientes />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
