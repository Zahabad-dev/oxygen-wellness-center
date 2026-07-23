import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';

const FORM_VACIO = { id: null, nombre: '', whatsapp: '', email: '', notasInternas: '', estado: 'activo' };

export default function Clientes() {
  const { user } = useAuth();
  const esAdmin = user.rol === 'administrador';
  const [clientes, setClientes] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [form, setForm] = useState(null); // null = cerrado

  function cargar() {
    setCargando(true);
    const params = buscar.trim() ? `?buscar=${encodeURIComponent(buscar.trim())}` : '';
    apiGet(`/staff/clientes${params}`)
      .then((data) => { setClientes(data); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscar]);

  async function crearAcceso(c) {
    const password = window.prompt(`Contraseña para ${c.nombre} (mínimo 4 caracteres) — el usuario para entrar es su WhatsApp: ${c.whatsapp}`);
    if (!password) return;
    try {
      await apiPost(`/staff/clientes/${c.id}/crear-acceso`, { password });
      setMensaje(`Acceso creado para ${c.nombre}. Ya puede entrar en "Mi cuenta" con su WhatsApp y esa contraseña.`);
      cargar();
    } catch (err) {
      alert(err.message);
    }
  }

  async function editar(c) {
    const data = await apiGet(`/admin/clientes/${c.id}`);
    setForm({
      id: data.id,
      nombre: data.nombre,
      whatsapp: data.whatsapp,
      email: data.email || '',
      notasInternas: data.notas_internas || '',
      estado: data.estado,
    });
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    try {
      await apiPut(`/admin/clientes/${form.id}`, form);
      setForm(null);
      setMensaje('Datos del cliente actualizados.');
      cargar();
    } catch (err) {
      alert(err.message);
    }
  }

  async function borrar(c) {
    if (!confirm(`¿Borrar por completo a ${c.nombre}? Esto también borra su historial de reservas y check-ins. No se puede deshacer.`)) return;
    try {
      await apiDelete(`/admin/clientes/${c.id}`);
      setMensaje(`${c.nombre} fue borrado.`);
      cargar();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="page">
      <span className="eyebrow">Clientes</span>
      <h1>Personas registradas</h1>
      <p style={{ color: 'var(--ink-soft)' }}>Se crean automáticamente en su primera reserva — aquí ves quién se ha registrado, cuántas clases ha tomado, y puedes darle acceso a su propia cuenta.</p>

      <div className="field" style={{ maxWidth: 320 }}>
        <label htmlFor="buscar">Buscar por nombre o WhatsApp</label>
        <input id="buscar" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Ej. María, 55…" />
      </div>

      {mensaje && <div className="alert success">{mensaje}</div>}
      {error && <div className="alert error">{error}</div>}
      {cargando && <div className="page-loading">Cargando…</div>}

      {form && (
        <form onSubmit={guardarEdicion} className="card" style={{ marginBottom: 20, maxWidth: 480 }}>
          <h3 style={{ marginTop: 0 }}>Editar cliente</h3>
          <div className="field">
            <label htmlFor="e-nombre">Nombre</label>
            <input id="e-nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="e-whatsapp">WhatsApp</label>
            <input id="e-whatsapp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="e-email">Correo</label>
            <input id="e-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="e-estado">Estado</label>
            <select id="e-estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="e-notas">Notas internas</label>
            <textarea id="e-notas" rows={2} value={form.notasInternas} onChange={(e) => setForm({ ...form, notasInternas: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" type="submit">Guardar cambios</button>
            <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <table className="responsive">
        <thead>
          <tr>
            <th>Nombre</th><th>WhatsApp</th><th>Correo</th><th>Clases tomadas</th><th>Reservas</th><th>Registrado</th><th>Cuenta</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id}>
              <td data-label="Nombre">{c.nombre}</td>
              <td data-label="WhatsApp">{c.whatsapp}</td>
              <td data-label="Correo">{c.email || '—'}</td>
              <td data-label="Clases tomadas"><span className="pill success">{c.clases_tomadas}</span></td>
              <td data-label="Reservas"><span className="pill accent">{c.reservas_total}</span></td>
              <td data-label="Registrado">{new Date(c.created_at).toLocaleDateString('es-MX')}</td>
              <td data-label="Cuenta">{c.tiene_acceso ? <span className="pill success">tiene acceso</span> : <span className="pill warning">sin acceso</span>}</td>
              <td data-label="Acciones" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => crearAcceso(c)}>
                  {c.tiene_acceso ? 'Cambiar contraseña' : 'Crear acceso'}
                </button>
                {esAdmin && (
                  <>
                    <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => editar(c)}>Editar</button>
                    <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5, color: 'var(--critical)' }} onClick={() => borrar(c)}>Borrar</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!cargando && clientes.length === 0 && <div className="empty-state">No se encontró nadie con ese criterio.</div>}
    </div>
  );
}
