import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../lib/apiClient.js';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

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

      <table>
        <thead><tr><th>Nombre</th><th>WhatsApp</th><th>Correo</th><th>Reservas</th><th>Registrado</th><th>Cuenta</th><th></th></tr></thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id}>
              <td>{c.nombre}</td>
              <td>{c.whatsapp}</td>
              <td>{c.email || '—'}</td>
              <td><span className="pill accent">{c.reservas_total}</span></td>
              <td>{new Date(c.created_at).toLocaleDateString('es-MX')}</td>
              <td>{c.tiene_acceso ? <span className="pill success">tiene acceso</span> : <span className="pill warning">sin acceso</span>}</td>
              <td>
                <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => crearAcceso(c)}>
                  {c.tiene_acceso ? 'Cambiar contraseña' : 'Crear acceso'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!cargando && clientes.length === 0 && <div className="empty-state">No se encontró nadie con ese criterio.</div>}
    </div>
  );
}
