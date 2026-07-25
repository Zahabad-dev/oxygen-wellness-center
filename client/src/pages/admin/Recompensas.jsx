import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../../lib/apiClient.js';
import AdminNav from '../../components/AdminNav.jsx';

export default function Recompensas() {
  const [form, setForm] = useState({ clasesRequeridas: 10, descripcion: '', activo: true });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    apiGet('/admin/recompensa')
      .then(setForm)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setMensaje('');
    setGuardando(true);
    try {
      const actualizado = await apiPut('/admin/recompensa', form);
      setForm(actualizado);
      setMensaje('Regla de recompensa guardada.');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="page">
      <span className="eyebrow">Admin</span>
      <h1>Recompensa por lealtad</h1>
      <AdminNav />

      <p style={{ color: 'var(--ink-soft)', maxWidth: 520 }}>
        Cuando un cliente completa este número de clases, le aparece en su portal (Mi cuenta)
        un botón para reclamar la recompensa que describas aquí. Al reclamarla, su conteo
        vuelve a empezar desde cero para la siguiente.
      </p>

      {cargando ? (
        <div className="page-loading">Cargando…</div>
      ) : (
        <form onSubmit={onSubmit} className="card" style={{ maxWidth: 480 }}>
          <div className="field">
            <label htmlFor="clasesRequeridas">Número de clases</label>
            <input
              id="clasesRequeridas"
              type="number"
              min={1}
              required
              value={form.clasesRequeridas}
              onChange={(e) => setForm({ ...form, clasesRequeridas: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="descripcion">Descripción de la recompensa</label>
            <textarea
              id="descripcion"
              rows={2}
              required
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Ej. 10% de descuento en tu siguiente clase"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, marginBottom: 14 }}>
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Activa (si se desactiva, nadie ve el botón de reclamar)
          </label>
          {error && <div className="alert error">{error}</div>}
          {mensaje && <div className="alert success">{mensaje}</div>}
          <button className="btn btn-primary" type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </form>
      )}
    </div>
  );
}
