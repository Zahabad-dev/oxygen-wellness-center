import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../../lib/apiClient.js';
import AdminNav from '../../components/AdminNav.jsx';
import ImageUploadField from '../../components/ImageUploadField.jsx';

const HERO_VACIO = { imagenUrl: '', titulo: '', subtitulo: '', ctaTexto: '' };
const ACTIVIDAD_VACIA = { activo: false, imagenUrl: '', titulo: '', dia: '', hora: '', descripcion: '', whatsapp: '', mensaje: '', ctaTexto: '' };

export default function Contenido() {
  const [hero, setHero] = useState(HERO_VACIO);
  const [heroError, setHeroError] = useState('');
  const [heroMensaje, setHeroMensaje] = useState('');
  const [heroCargando, setHeroCargando] = useState(true);
  const [heroGuardando, setHeroGuardando] = useState(false);

  const [actividad, setActividad] = useState(ACTIVIDAD_VACIA);
  const [actError, setActError] = useState('');
  const [actMensaje, setActMensaje] = useState('');
  const [actCargando, setActCargando] = useState(true);
  const [actGuardando, setActGuardando] = useState(false);

  useEffect(() => {
    apiGet('/admin/contenido/hero')
      .then(setHero)
      .catch((err) => setHeroError(err.message))
      .finally(() => setHeroCargando(false));
    apiGet('/admin/contenido/actividad-mes')
      .then(setActividad)
      .catch((err) => setActError(err.message))
      .finally(() => setActCargando(false));
  }, []);

  async function onSubmitHero(e) {
    e.preventDefault();
    setHeroError('');
    setHeroMensaje('');
    setHeroGuardando(true);
    try {
      await apiPut('/admin/contenido/hero', hero);
      setHeroMensaje('Cambios guardados — ya se ven en el sitio.');
    } catch (err) {
      setHeroError(err.message);
    } finally {
      setHeroGuardando(false);
    }
  }

  async function onSubmitActividad(e) {
    e.preventDefault();
    setActError('');
    setActMensaje('');
    setActGuardando(true);
    try {
      const guardada = await apiPut('/admin/contenido/actividad-mes', actividad);
      setActividad(guardada);
      setActMensaje('Cambios guardados — ya se ven en el sitio.');
    } catch (err) {
      setActError(err.message);
    } finally {
      setActGuardando(false);
    }
  }

  return (
    <div className="page">
      <span className="eyebrow">Admin</span>
      <h1>Contenido del sitio</h1>
      <AdminNav />

      <p style={{ color: 'var(--ink-soft)', maxWidth: 560 }}>
        La foto y el texto principal del inicio (el hero, justo debajo del logo). Sube la foto directo con el
        botón, o pega la ruta a mano si ya la subiste antes.
      </p>

      {heroCargando && <div className="page-loading">Cargando…</div>}

      {!heroCargando && (
        <form onSubmit={onSubmitHero} className="card" style={{ marginBottom: 32, maxWidth: 560 }}>
          <ImageUploadField
            id="imagenUrl"
            label="Foto del hero"
            value={hero.imagenUrl}
            onChange={(imagenUrl) => setHero({ ...hero, imagenUrl })}
            previewHeight={220}
            hint="Medida recomendada: vertical, mínimo 1600×2000 px — cubre toda la pantalla, de celular a computadora."
          />
          <div className="field">
            <label htmlFor="titulo">Título</label>
            <input id="titulo" required value={hero.titulo} onChange={(e) => setHero({ ...hero, titulo: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="subtitulo">Subtítulo</label>
            <input id="subtitulo" value={hero.subtitulo} onChange={(e) => setHero({ ...hero, subtitulo: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="ctaTexto">Texto del botón</label>
            <input id="ctaTexto" value={hero.ctaTexto} onChange={(e) => setHero({ ...hero, ctaTexto: e.target.value })} placeholder="Reservar" />
          </div>

          {heroError && <div className="alert error">{heroError}</div>}
          {heroMensaje && <div className="alert success">{heroMensaje}</div>}

          <button className="btn btn-primary" type="submit" disabled={heroGuardando}>Guardar cambios</button>
        </form>
      )}

      <h2 style={{ fontSize: 20 }}>Actividad especial del mes</h2>
      <p style={{ color: 'var(--ink-soft)', maxWidth: 560 }}>
        Reemplaza la sección "Aquí nadie entrena en soledad" del sitio. Actívala cuando tengas algo que anunciar
        (evento, reto del mes, clase especial) con foto tipo flyer, día, hora y botón de reserva por WhatsApp — y
        desactívala cuando no haya nada, para que la sección desaparezca sola del sitio sin tocar código.
      </p>

      {actCargando && <div className="page-loading">Cargando…</div>}

      {!actCargando && (
        <form onSubmit={onSubmitActividad} className="card" style={{ maxWidth: 560 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, marginBottom: 14 }}>
            <input type="checkbox" checked={actividad.activo} onChange={(e) => setActividad({ ...actividad, activo: e.target.checked })} />
            Activa (visible en el sitio)
          </label>
          <ImageUploadField
            id="act-imagenUrl"
            label="Foto tipo flyer del evento"
            value={actividad.imagenUrl}
            onChange={(imagenUrl) => setActividad({ ...actividad, imagenUrl })}
            previewHeight={200}
            hint="Medida recomendada: horizontal, mínimo 1200×900 px (proporción 4:3)."
          />
          <div className="field">
            <label htmlFor="act-titulo">Título</label>
            <input id="act-titulo" value={actividad.titulo} onChange={(e) => setActividad({ ...actividad, titulo: e.target.value })} placeholder="Ej. Reto de Sculpt de septiembre" />
          </div>
          <div className="field">
            <label htmlFor="act-dia">Día</label>
            <input id="act-dia" value={actividad.dia} onChange={(e) => setActividad({ ...actividad, dia: e.target.value })} placeholder="Ej. Sábado 27 de septiembre" />
          </div>
          <div className="field">
            <label htmlFor="act-hora">Hora</label>
            <input id="act-hora" value={actividad.hora} onChange={(e) => setActividad({ ...actividad, hora: e.target.value })} placeholder="Ej. 9:00 am" />
          </div>
          <div className="field">
            <label htmlFor="act-descripcion">Descripción</label>
            <textarea id="act-descripcion" rows={3} value={actividad.descripcion} onChange={(e) => setActividad({ ...actividad, descripcion: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="act-whatsapp">WhatsApp para reservar</label>
            <input id="act-whatsapp" value={actividad.whatsapp} onChange={(e) => setActividad({ ...actividad, whatsapp: e.target.value })} placeholder="527352491512" />
          </div>
          <div className="field">
            <label htmlFor="act-mensaje">Mensaje precargado de WhatsApp (opcional)</label>
            <textarea id="act-mensaje" rows={2} value={actividad.mensaje} onChange={(e) => setActividad({ ...actividad, mensaje: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="act-ctaTexto">Texto del botón</label>
            <input id="act-ctaTexto" value={actividad.ctaTexto} onChange={(e) => setActividad({ ...actividad, ctaTexto: e.target.value })} placeholder="Reservar mi lugar" />
          </div>

          {actError && <div className="alert error">{actError}</div>}
          {actMensaje && <div className="alert success">{actMensaje}</div>}

          <button className="btn btn-primary" type="submit" disabled={actGuardando}>Guardar cambios</button>
        </form>
      )}
    </div>
  );
}
