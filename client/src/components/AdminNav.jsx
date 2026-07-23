import { NavLink } from 'react-router-dom';

export default function AdminNav() {
  return (
    <div className="chip-row" style={{ marginBottom: 22 }}>
      <NavLink to="/admin/coaches" className={({ isActive }) => `chip ${isActive ? 'active' : ''}`}>Coaches</NavLink>
      <NavLink to="/admin/clases" className={({ isActive }) => `chip ${isActive ? 'active' : ''}`}>Clases</NavLink>
      <NavLink to="/admin/usuarios" className={({ isActive }) => `chip ${isActive ? 'active' : ''}`}>Usuarios</NavLink>
      <NavLink to="/staff/clientes" className={({ isActive }) => `chip ${isActive ? 'active' : ''}`}>Clientes</NavLink>
    </div>
  );
}
