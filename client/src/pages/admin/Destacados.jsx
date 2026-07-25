import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/apiClient.js';
import AdminNav from '../../components/AdminNav.jsx';

const FORM_VACIO = { id: null, titulo: '', subtitulo: '', fechas: '', imagenUrl: '', whatsapp: '', mensaje: '', orden: 0, activo: true };

export default function Destacados() {
  const [destacados, setDestacados] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    apiGet('/admin/destacados').then(setDestacados).catch((err) => setError(err.message));
  }

  useEffect(cargar, []);

  function editar(d) {
    setForm({
      id: d.id,
      titulo: d.titulo,
      subtitulo: d.subtitulo || '',
      fechas: d.fechas || '',
      imagenUrl: d.imagen_url,
      whatsapp: d.whatsapp || '',
      mensaje: d.mensaje || '',
      orden: d.orden,
      activo: d.activo,
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      if (form.id) {
        await apiPut(`/admin/destacados/${form.id}`, form);
      } else {
        await apiPost('/admin/destacados', form);
      }
      setForm(FORM_VACIO);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(d) {
    if (!confirm(`¿Eliminar "${d.titulo}" de Destacados?`)) return;
    await apiDelete(`/admin/destacados/${d.id}`);
    cargar();
  }

  return (
    <div className="page">
      <span className="eyebrow">Admin</span>
      <h1>Destacados</h1>
      <AdminNav />

      <p style={{ color: 'var(--ink-soft)', maxWidth: 560 }}>
        Eventos y talleres especiales que aparecen en el carrusel del inicio, entre el hero y las disciplinas.
        La imagen debe existir ya en el sitio (ej. súbela primero a <code>client/public/images/eventos/</code>
        y aquí pon su ruta, como <code>/images/eventos/mi-evento.jpg</code>).
      </p>

      <form onSubmit={onSubmit} className="card" style={{ marginBottom: 24, maxWidth: 560 }}>
        <h3 style={{ marginTop: 0 }}>{form.id ? 'Editar destacado' : 'Nuevo destacado'}</h3>
        <div className="field">
          <label htmlFor="titulo">Título</label>
          <input id="titulo" required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="subtitulo">Subtítulo (opcional)</label>
          <input id="subtitulo" value={form.subtitulo} onChange={(e) => setForm({ ...form, subtitulo: e.target.value })} placeholder="Ej. Karla Marín · Facilitadora de Barras de Access" />
        </div>
        <div className="field">
          <label htmlFor="fechas">Fechas (opcional)</label>
          <input id="fechas" value={form.fechas} onChange={(e) => setForm({ ...form, fechas: e.target.value })} placeholder="Ej. 25 y 26 de julio · Certificación de 1 día" />
        </div>
        <div className="field">
          <label htmlFor="imagenUrl">Ruta de la imagen</label>
          <input id="imagenUrl" required value={form.imagenUrl} onChange={(e) => setForm({ ...form, imagenUrl: e.target.value })} placeholder="/images/eventos/mi-evento.jpg" />
        </div>
        <div className="field">
          <label htmlFor="whatsapp">WhatsApp para reservar (opcional)</label>
          <input id="whatsapp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="527352491512" />
        </div>
        <div className="field">
          <label htmlFor="mensaje">Mensaje precargado de WhatsApp (opcional)</label>
          <textarea id="mensaje" rows={2} value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="orden">Orden (menor número aparece primero)</label>
          <input id="orden" type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, marginBottom: 14 }}>
          <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
          Activo (visible en el carrusel del sitio)
        </label>
        {error && <div className="alert error">{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" type="submit" disabled={guardando}>
            {form.id ? 'Guardar cambios' : 'Crear destacado'}
          </button>
          {form.id && (
            <button type="button" className="btn btn-secondary" onClick={() => setForm(FORM_VACIO)}>Cancelar</button>
          )}
        </div>
      </form>

      <div className="grid cols-2">
        {destacados.map((d) => (
          <div key={d.id} className="card" style={{ opacity: d.activo ? 1 : 0.5 }}>
            <h4 style={{ marginBottom: 4 }}>{d.titulo} {!d.activo && <span className="pill critical">inactivo</span>}</h4>
            {d.subtitulo && <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 4px' }}>{d.subtitulo}</p>}
            {d.fechas && <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: '0 0 10px' }}>{d.fechas}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => editar(d)}>Editar</button>
              <button className="btn btn-ghost" onClick={() => eliminar(d)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
