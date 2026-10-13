import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut } from '../../lib/apiClient.js';
import AdminNav from '../../components/AdminNav.jsx';
import ImageUploadField from '../../components/ImageUploadField.jsx';

const FORM_NUEVA = { id: null, nombre: '', color: '#818c68', descripcion: '', imagenUrl: '', activo: true };

export default function Disciplinas() {
  const [disciplinas, setDisciplinas] = useState([]);
  const [form, setForm] = useState(null); // null = cerrado
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    apiGet('/admin/disciplinas').then(setDisciplinas).catch((err) => setError(err.message));
  }

  useEffect(cargar, []);

  function editar(d) {
    setMensaje('');
    setError('');
    setForm({
      id: d.id,
      nombre: d.nombre,
      nombreOriginal: d.nombre,
      color: d.color,
      descripcion: d.descripcion || '',
      imagenUrl: d.imagen_url || '',
      activo: d.activo,
    });
  }

  function nueva() {
    setMensaje('');
    setError('');
    setForm(FORM_NUEVA);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.id && form.nombre.trim() !== form.nombreOriginal) {
      const seguir = confirm(
        `Ojo: la tabla de "Horarios" del sitio tiene los nombres de las clases escritos a mano. ` +
        `Si cambias "${form.nombreOriginal}" por "${form.nombre.trim()}", esa tabla seguirá diciendo "${form.nombreOriginal}" ` +
        `hasta que se actualice aparte (avísale a quien da mantenimiento al sitio).\n\n` +
        `El resto del sitio (calendario, coaches, disciplinas) sí usará el nombre nuevo. ¿Guardar el cambio de nombre?`
      );
      if (!seguir) return;
    }
    setGuardando(true);
    try {
      if (form.id) {
        await apiPut(`/admin/disciplinas/${form.id}`, form);
      } else {
        await apiPost('/admin/disciplinas', form);
      }
      setMensaje(form.id ? `"${form.nombre}" actualizada.` : `"${form.nombre}" creada — ya aparece al crear clases y asignar coaches.`);
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
      <h1>Disciplinas (categorías de clase)</h1>
      <AdminNav />

      <p style={{ color: 'var(--ink-soft)', maxWidth: 560 }}>
        Las categorías de clase del sitio: nombre, color, foto y descripción. Crea las que necesites; si una ya no se
        da, desactívala (no se borra porque hay clases que ya la usaron).
      </p>

      {error && <div className="alert error">{error}</div>}
      {mensaje && <div className="alert success">{mensaje}</div>}

      {!form && (
        <button className="btn btn-primary" type="button" style={{ marginBottom: 20 }} onClick={nueva}>Nueva disciplina</button>
      )}

      {form && (
        <form onSubmit={onSubmit} className="card" style={{ marginBottom: 24, maxWidth: 520 }}>
          <h3 style={{ marginTop: 0 }}>{form.id ? `Editar "${form.nombre}"` : 'Nueva disciplina'}</h3>
          <div className="field">
            <label htmlFor="d-nombre">Nombre</label>
            <input id="d-nombre" required maxLength={40} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Yoga" />
          </div>
          <ImageUploadField
            id="imagenUrl"
            label="Foto de la disciplina"
            value={form.imagenUrl}
            onChange={(imagenUrl) => setForm((f) => ({ ...f, imagenUrl }))}
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
            <button className="btn btn-primary" type="submit" disabled={guardando}>{form.id ? 'Guardar cambios' : 'Crear disciplina'}</button>
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
            <p style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{d.imagen_url || 'Sin foto propia.'}</p>
            <button className="btn btn-secondary" onClick={() => editar(d)}>Editar</button>
          </div>
        ))}
      </div>
    </div>
  );
}
