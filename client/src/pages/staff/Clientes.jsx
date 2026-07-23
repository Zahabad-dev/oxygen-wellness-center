import { useEffect, useState } from 'react';
import { apiGet } from '../../lib/apiClient.js';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setCargando(true);
      const params = buscar.trim() ? `?buscar=${encodeURIComponent(buscar.trim())}` : '';
      apiGet(`/staff/clientes${params}`)
        .then((data) => { setClientes(data); setError(''); })
        .catch((err) => setError(err.message))
        .finally(() => setCargando(false));
    }, 250);
    return () => clearTimeout(t);
  }, [buscar]);

  return (
    <div className="page">
      <span className="eyebrow">Clientes</span>
      <h1>Personas registradas</h1>
      <p style={{ color: 'var(--ink-soft)' }}>Se crean automáticamente en su primera reserva — aquí ves quién se ha registrado y cuántas clases ha tomado.</p>

      <div className="field" style={{ maxWidth: 320 }}>
        <label htmlFor="buscar">Buscar por nombre o WhatsApp</label>
        <input id="buscar" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Ej. María, 55…" />
      </div>

      {error && <div className="alert error">{error}</div>}
      {cargando && <div className="page-loading">Cargando…</div>}

      <table>
        <thead><tr><th>Nombre</th><th>WhatsApp</th><th>Correo</th><th>Reservas</th><th>Registrado</th></tr></thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id}>
              <td>{c.nombre}</td>
              <td>{c.whatsapp}</td>
              <td>{c.email || '—'}</td>
              <td><span className="pill accent">{c.reservas_total}</span></td>
              <td>{new Date(c.created_at).toLocaleDateString('es-MX')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!cargando && clientes.length === 0 && <div className="empty-state">No se encontró nadie con ese criterio.</div>}
    </div>
  );
}
