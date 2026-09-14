import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../../lib/apiClient.js';
import AdminNav from '../../components/AdminNav.jsx';

const FORM_VACIO = { imagenUrl: '', titulo: '', subtitulo: '', ctaTexto: '' };

export default function Contenido() {
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    apiGet('/admin/contenido/hero')
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
      await apiPut('/admin/contenido/hero', form);
      setMensaje('Cambios guardados — ya se ven en el sitio.');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="page">
      <span className="eyebrow">Admin</span>
      <h1>Contenido del sitio</h1>
      <AdminNav />

      <p style={{ color: 'var(--ink-soft)', maxWidth: 560 }}>
        La foto y el texto principal del inicio (el hero, justo debajo del logo). La imagen debe existir ya en el
        sitio (súbela primero a <code>client/public/images/</code> y aquí pon su ruta, como <code>/images/hero-image.png</code>).
      </p>

      {cargando && <div className="page-loading">Cargando…</div>}

      {!cargando && (
        <form onSubmit={onSubmit} className="card" style={{ maxWidth: 560 }}>
          <div className="field">
            <label htmlFor="imagenUrl">Ruta de la foto del hero</label>
            <input
              id="imagenUrl"
              required
              value={form.imagenUrl}
              onChange={(e) => setForm({ ...form, imagenUrl: e.target.value })}
              placeholder="/images/hero-image.png"
            />
          </div>
          <div className="field">
            <label htmlFor="titulo">Título</label>
            <input id="titulo" required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="subtitulo">Subtítulo</label>
            <input id="subtitulo" value={form.subtitulo} onChange={(e) => setForm({ ...form, subtitulo: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="ctaTexto">Texto del botón</label>
            <input id="ctaTexto" value={form.ctaTexto} onChange={(e) => setForm({ ...form, ctaTexto: e.target.value })} placeholder="Reservar" />
          </div>

          {form.imagenUrl && (
            <div className="field">
              <label>Vista previa</label>
              <img
                src={form.imagenUrl}
                alt="Vista previa del hero"
                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
          )}

          {error && <div className="alert error">{error}</div>}
          {mensaje && <div className="alert success">{mensaje}</div>}

          <button className="btn btn-primary" type="submit" disabled={guardando}>Guardar cambios</button>
        </form>
      )}
    </div>
  );
}
