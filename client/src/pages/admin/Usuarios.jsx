import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/apiClient.js';
import AdminNav from '../../components/AdminNav.jsx';

const FORM_VACIO = { id: null, nombre: '', email: '', password: '', rol: 'recepcion', coachId: '' };
const ROL_LABEL = { administrador: 'Administradora', recepcion: 'Recepción', coach: 'Coach' };

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    apiGet('/admin/usuarios').then(setUsuarios).catch((err) => setError(err.message));
  }

  useEffect(() => {
    cargar();
    apiGet('/admin/coaches').then((data) => setCoaches(data.filter((c) => c.activo))).catch(() => {});
  }, []);

  function editar(u) {
    setForm({ id: u.id, nombre: u.nombre, email: u.email, password: '', rol: u.rol, coachId: u.coach_id || '' });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      if (form.id) {
        const { id, email, ...datos } = form; // el email no se edita aquí para no complicar el login
        await apiPut(`/admin/usuarios/${form.id}`, datos);
      } else {
        await apiPost('/admin/usuarios', form);
      }
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function desactivar(u) {
    if (!confirm(`¿Desactivar el acceso de ${u.nombre}? Ya no podrá iniciar sesión.`)) return;
    await apiDelete(`/admin/usuarios/${u.id}`);
    cargar();
  }

  return (
    <div className="page">
      <span className="eyebrow">Admin</span>
      <h1>Usuarios de staff</h1>
      <AdminNav />

      <form onSubmit={onSubmit} className="card" style={{ marginBottom: 24, maxWidth: 480 }}>
        <h3 style={{ marginTop: 0 }}>{form.id ? `Editar acceso — ${form.email}` : 'Nuevo acceso'}</h3>
        <div className="field">
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        {!form.id && (
          <div className="field">
            <label htmlFor="email">Correo (con el que va a entrar)</label>
            <input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        )}
        <div className="field">
          <label htmlFor="password">{form.id ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
          <input id="password" type="text" required={!form.id} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={form.id ? 'Déjalo vacío para no cambiarla' : ''} />
        </div>
        <div className="field">
          <label htmlFor="rol">Rol</label>
          <select id="rol" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
            <option value="recepcion">Recepción</option>
            <option value="coach">Coach</option>
            <option value="administrador">Administradora</option>
          </select>
        </div>
        {form.rol === 'coach' && (
          <div className="field">
            <label htmlFor="coach">¿Cuál coach es?</label>
            <select id="coach" required value={form.coachId} onChange={(e) => setForm({ ...form, coachId: e.target.value })}>
              <option value="">Selecciona…</option>
              {coaches.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <p className="subtle" style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '4px 0 0' }}>
              Así, al entrar, solo verá sus propias clases y reservaciones.
            </p>
          </div>
        )}
        {error && <div className="alert error">{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" type="submit" disabled={guardando}>
            {form.id ? 'Guardar cambios' : 'Crear acceso'}
          </button>
          {form.id && (
            <button type="button" className="btn btn-secondary" onClick={() => setForm(FORM_VACIO)}>Cancelar</button>
          )}
        </div>
      </form>

      <table>
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Coach ligado</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.5 }}>
              <td>{u.nombre}</td>
              <td>{u.email}</td>
              <td><span className="pill accent">{ROL_LABEL[u.rol] || u.rol}</span></td>
              <td>{u.coach_nombre || '—'}</td>
              <td>{u.activo ? <span className="pill success">activo</span> : <span className="pill critical">inactivo</span>}</td>
              <td style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => editar(u)}>Editar</button>
                {u.activo && (
                  <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => desactivar(u)}>Desactivar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
