import { useEffect, useRef, useState } from 'react';
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
  const heroBgRef = useRef(null);
  const landingRef = useRef(null);

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

  // Parallax sutil del hero + aparición de secciones al hacer scroll.
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let ticking = false;
    function onScroll() {
      if (reduceMotion || !heroBgRef.current || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 700);
        heroBgRef.current.style.transform = `translateY(${y * 0.18}px)`;
        ticking = false;
      });
    }
    if (!reduceMotion) window.addEventListener('scroll', onScroll, { passive: true });

    const els = landingRef.current?.querySelectorAll('.reveal') || [];
    if (reduceMotion) {
      els.forEach((el) => el.classList.add('is-visible'));
      return () => window.removeEventListener('scroll', onScroll);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="landing" ref={landingRef}>
      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div className="hero-bg" ref={heroBgRef} style={{ backgroundImage: "url('/images/hero.jpg')" }} />
        <div className="hero-overlay" />
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
        <span className="blob" aria-hidden="true" />
        <div className="section-inner">
          <div className="section-head reveal">
            <span className="eyebrow">Disciplinas</span>
            <h2>Encuentra tu ritmo</h2>
            <p>Cada disciplina tiene su propio color en el calendario — elige una para filtrar, o reserva directo.</p>
          </div>
          <div className="discipline-strip reveal reveal-1">
            {disciplinas.map((d) => {
              const theme = disciplineTheme(d.nombre);
              return (
                <button
                  key={d.id}
                  className={`discipline-card ${disciplinaId === d.id ? 'active' : ''}`}
                  onClick={() => elegirDisciplina(d.id)}
                >
                  <img className="thumb" src={theme.image} alt={d.nombre} loading="lazy" decoding="async" />
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
        <span className="blob" aria-hidden="true" />
        <div className="section-inner">
          <div className="section-head reveal">
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
        <span className="blob" aria-hidden="true" />
        <div className="section-inner">
          <img className="reveal" src="/images/comunidad.jpg" alt="Comunidad de Oxygen Wellness Center practicando juntas" loading="lazy" decoding="async" />
          <div className="reveal reveal-1">
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

      {/* ---------- Cómo funciona ---------- */}
      <section className="disciplines">
        <div className="section-inner">
          <div className="section-head reveal">
            <span className="eyebrow">Cómo funciona</span>
            <h2>Tres pasos, sin complicarte</h2>
          </div>
          <div className="grid cols-3 reveal reveal-1">
            <div className="card">
              <h4>1. Reserva</h4>
              <p>Elige tu clase en el calendario y deja tu nombre y WhatsApp — sin crear cuenta.</p>
            </div>
            <div className="card">
              <h4>2. Recibe tu QR</h4>
              <p>Es tuyo para siempre. Guárdalo, compártelo a tu WhatsApp o descárgalo.</p>
            </div>
            <div className="card">
              <h4>3. Check-in</h4>
              <p>Muéstralo en recepción al llegar — así de simple, cada vez que vengas.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="site">
        <img className="footer-logo" src="/images/logo-oxigen.png" alt="Oxigen Wellness Center" loading="lazy" />
        <div className="footer-links">
          <a href="#disciplinas">Disciplinas</a>
          <a href="#calendario">Calendario</a>
          <a href="/mi-cuenta/login">Mi cuenta</a>
        </div>
        Oxygen Wellness Center · Reserva sin cuenta, tu QR es tuyo para siempre.
      </footer>

      <BookingModal claseId={modalClaseId} onClose={() => setModalClaseId(null)} />
    </div>
  );
}
