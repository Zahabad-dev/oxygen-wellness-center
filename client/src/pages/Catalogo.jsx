import { useEffect, useState } from 'react';
import { apiGet } from '../lib/apiClient.js';
import { disciplineTheme } from '../lib/disciplineTheme.js';
import { getWeekDays } from '../lib/dates.js';
import BookingModal from '../components/BookingModal.jsx';

const DIAS = getWeekDays(7);

export default function Catalogo() {
  const [disciplinas, setDisciplinas] = useState([]);
  const [clases, setClases] = useState([]);
  const [disciplinaId, setDisciplinaId] = useState(null);
  const [dia, setDia] = useState(DIAS[0].iso);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [modalClaseId, setModalClaseId] = useState(null);

  useEffect(() => {
    apiGet('/disciplinas').then(setDisciplinas).catch(() => {});
  }, []);

  useEffect(() => {
    setCargando(true);
    const params = new URLSearchParams({ fecha: dia });
    if (disciplinaId) params.set('disciplina', disciplinaId);
    apiGet(`/clases?${params.toString()}`)
      .then((data) => { setClases(data); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [disciplinaId, dia]);

  function elegirDisciplina(id) {
    setDisciplinaId((current) => (current === id ? null : id));
    document.getElementById('calendario')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="landing">
      {/* ---------- Hero ---------- */}
      <section className="hero" style={{ backgroundImage: "url('/images/hero.jpg')" }}>
        <div className="hero-inner">
          <span className="hero-eyebrow">Oxygen Wellness Center</span>
          <h1 className="hero-title">Tu espacio para moverte,<br />respirar y <em>pertenecer</em>.</h1>
          <p className="hero-sub">
            Functional Training, Pilates, Yoga, Barre y más — reserva tu lugar en segundos,
            sin crear una cuenta.
          </p>
          <div className="hero-actions">
            <a href="#calendario" className="btn btn-primary btn-lg">Reservar ahora</a>
            <a href="#disciplinas" className="btn btn-secondary btn-lg">Ver disciplinas</a>
          </div>
        </div>
      </section>

      {/* ---------- Disciplinas ---------- */}
      <section id="disciplinas" className="disciplines">
        <div className="section-inner">
          <div className="section-head">
            <span className="eyebrow">Disciplinas</span>
            <h2>Encuentra tu ritmo</h2>
            <p>Cada disciplina tiene su propio color en el calendario — elige una para filtrar, o reserva directo.</p>
          </div>
          <div className="discipline-strip">
            {disciplinas.map((d) => {
              const theme = disciplineTheme(d.nombre);
              return (
                <button
                  key={d.id}
                  className={`discipline-card ${disciplinaId === d.id ? 'active' : ''}`}
                  onClick={() => elegirDisciplina(d.id)}
                >
                  <div className="thumb" style={{ backgroundImage: `url('${theme.image}')` }} />
                  <div className="label">
                    <span className="disc-dot" style={{ background: theme.color }} />
                    {d.nombre}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Calendario ---------- */}
      <section id="calendario" className="calendar-section">
        <div className="section-inner">
          <div className="section-head">
            <span className="eyebrow">Calendario</span>
            <h2>Reserva tu clase</h2>
            <p>Elige el día y, si quieres, filtra por disciplina.</p>
          </div>

          <div className="day-tabs">
            {DIAS.map((d) => (
              <button
                key={d.iso}
                className={`day-tab ${dia === d.iso ? 'active' : ''} ${d.isToday ? 'today' : ''}`}
                onClick={() => setDia(d.iso)}
              >
                <span className="dow">{d.isToday ? 'Hoy' : d.dow}</span>
                <span className="num">{d.num}</span>
              </button>
            ))}
          </div>

          <div className="chip-row">
            <span className={`chip ${!disciplinaId ? 'active' : ''}`} onClick={() => setDisciplinaId(null)}>Todas</span>
            {disciplinas.map((d) => (
              <span
                key={d.id}
                className={`chip ${disciplinaId === d.id ? 'active' : ''}`}
                onClick={() => setDisciplinaId(disciplinaId === d.id ? null : d.id)}
              >
                <span className="disc-dot" style={{ background: disciplineTheme(d.nombre).color, marginRight: 6 }} />
                {d.nombre}
              </span>
            ))}
          </div>

          {error && <div className="alert error">{error}</div>}
          {cargando && <div className="page-loading">Cargando clases…</div>}
          {!cargando && !error && clases.length === 0 && (
            <div className="empty-state">No hay clases programadas ese día con esos filtros.</div>
          )}

          <div className="class-grid">
            {clases.map((c) => {
              const theme = disciplineTheme(c.disciplina_nombre);
              const lleno = c.cupoDisponible <= 0;
              return (
                <button
                  key={c.id}
                  className="class-card"
                  style={{ '--card-color': c.disciplina_color || theme.color }}
                  onClick={() => setModalClaseId(c.id)}
                >
                  <div className="top">
                    <span className="hora">{c.hora_inicio?.slice(0, 5)}</span>
                    {c.nivel && <span className="pill accent">{c.nivel}</span>}
                  </div>
                  <div className="disciplina">{c.disciplina_nombre}</div>
                  <div className="meta">{c.coach_nombre} · {c.duracion_minutos} min · {c.salon_nombre}</div>
                  <div className="progress"><span style={{ width: `${Math.min(100, Math.round((c.confirmadas / c.capacidad_maxima) * 100))}%`, background: lleno ? 'var(--critical)' : undefined }} /></div>
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-soft)' }}>
                    {lleno ? 'Llena — lista de espera' : `${c.cupoDisponible} lugares`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Comunidad ---------- */}
      <section className="community">
        <div className="section-inner">
          <img src="/images/comunidad.jpg" alt="Comunidad de Oxygen Wellness Center practicando juntas" />
          <div>
            <span className="eyebrow">Comunidad</span>
            <h2>No entrenas sola.</h2>
            <blockquote>“Un espacio para cuidarte, a tu ritmo, acompañada.”</blockquote>
            <p style={{ color: 'var(--ink-soft)' }}>
              En Oxygen creemos que cada cuerpo tiene su propio proceso. Nuestros coaches te acompañan
              desde tu primera clase — sin presión, sin comparaciones, con técnica y calidez.
            </p>
          </div>
        </div>
      </section>

      <footer className="site">
        Oxygen Wellness Center · Reserva sin cuenta, tu QR es tuyo para siempre.
      </footer>

      <BookingModal claseId={modalClaseId} onClose={() => setModalClaseId(null)} />
    </div>
  );
}
