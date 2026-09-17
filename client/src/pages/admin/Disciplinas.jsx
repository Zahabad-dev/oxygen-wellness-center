import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../../lib/apiClient.js';
import AdminNav from '../../components/AdminNav.jsx';
import ImageUploadField from '../../components/ImageUploadField.jsx';

export default function Disciplinas() {
  const [disciplinas, setDisciplinas] = useState([]);
  const [form, setForm] = useState(null); // { id, color, descripcion, imagenUrl, activo }
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    apiGet('/admin/disciplinas').then(setDisciplinas).catch((err) => setError(err.message));
  }

  useEffect(cargar, []);

  function editar(d) {
    setMensaje('');
    setForm({
      id: d.id,
      nombre: d.nombre,
      color: d.color,
      descripcion: d.descripcion || '',
      imagenUrl: d.imagen_url || '',
      activo: d.activo,
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await apiPut(`/admin/disciplinas/${form.id}`, form);
      setMensaje(`"${form.nombre}" actualizada.`);
      setForm(null);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="page">
      <span className="eyebrow">Admin</span>
      <h1>Disciplinas (clases)</h1>
      <AdminNav />

      <p style={{ color: 'var(--ink-soft)', maxWidth: 560 }}>
        La foto, el color y la descripción de cada disciplina tal como aparecen en el catálogo del sitio.
      </p>

      {error && <div className="alert error">{error}</div>}
      {mensaje && <div className="alert success">{mensaje}</div>}

      {form && (
        <form onSubmit={onSubmit} className="card" style={{ marginBottom: 24, maxWidth: 520 }}>
          <h3 style={{ marginTop: 0 }}>Editar "{form.nombre}"</h3>
          <ImageUploadField
            id="imagenUrl"
            label="Foto de la disciplina"
            value={form.imagenUrl}
            onChange={(imagenUrl) => setForm({ ...form, imagenUrl })}
            hint="Medida recomendada: vertical, mínimo 900×1200 px (proporción 3:4)."
          />
          <div className="field">
            <label htmlFor="color">Color (para el calendario)</label>
            <input id="color" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} style={{ width: 80, padding: 4 }} />
          </div>
          <div className="field">
            <label htmlFor="descripcion">Descripción (opcional)</label>
            <textarea id="descripcion" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, marginBottom: 14 }}>
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
            Activa (visible en el sitio)
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={guardando}>Guardar cambios</button>
            <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="grid cols-2">
        {disciplinas.map((d) => (
          <div key={d.id} className="card" style={{ opacity: d.activo ? 1 : 0.5 }}>
            <h4 style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
              {d.nombre} {!d.activo && <span className="pill critical">inactiva</span>}
            </h4>
            {d.descripcion && <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{d.descripcion}</p>}
            <p style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{d.imagen_url || 'Sin foto propia — usa la del coach por defecto.'}</p>
            <button className="btn btn-secondary" onClick={() => editar(d)}>Editar</button>
          </div>
        ))}
      </div>
    </div>
  );
}
