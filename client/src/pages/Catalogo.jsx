import { useEffect, useRef, useState } from 'react';
import { apiGet } from '../lib/apiClient.js';
import { disciplineTheme } from '../lib/disciplineTheme.js';
import { getWeekDays } from '../lib/dates.js';
import BookingModal from '../components/BookingModal.jsx';

const DIAS = getWeekDays(7);

// Membresías reales del estudio (precio por paquete de clases, individual y dúo).
const MEMBRESIAS = [
  { clases: 1, individual: 85, duo: 85 },
  { clases: 4, individual: 320, duo: 320 },
  { clases: 8, individual: 640, duo: 600 },
  { clases: 12, individual: 840, duo: 800 },
  { clases: 16, individual: 1040, duo: 1000 },
  { clases: 20, individual: 1240, duo: 1200 },
];
const money = (n) => `$${n.toLocaleString('es-MX')}`;

// Horario semanal recurrente real del estudio (coincide con las clases generadas en agenda).
const HORARIO_SEMANA = [
  { dia: 'Lunes', clases: [['07:00', 'Funcional'], ['08:00', 'Sculpt'], ['18:00', 'Sculpt'], ['19:00', 'Pilates'], ['20:00', 'Baile']] },
  { dia: 'Martes', clases: [['08:00', 'Baile'], ['19:00', 'Funcional']] },
  { dia: 'Miércoles', clases: [['07:00', 'Funcional'], ['08:00', 'Sculpt'], ['18:00', 'Pilates'], ['19:00', 'Baile']] },
  { dia: 'Jueves', clases: [['08:00', 'Baile'], ['19:00', 'Funcional']] },
  { dia: 'Viernes', clases: [['07:00', 'Funcional'], ['08:00', 'Pilates'], ['19:00', 'Baile']] },
  { dia: 'Sábado', clases: [['08:00', 'Funcional']] },
];

export default function Catalogo() {
  const [disciplinas, setDisciplinas] = useState([]);
  const [coaches, setCoaches] = useState([]);
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
    apiGet('/coaches').then(setCoaches).catch(() => {});
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
          <span className="hero-eyebrow">Oxigen Wellness Center</span>
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

      {/* ---------- Coaches ---------- */}
      <section id="coaches" className="disciplines">
        <span className="blob" aria-hidden="true" />
        <div className="section-inner">
          <div className="section-head center reveal">
            <span className="eyebrow">Nuestro equipo</span>
            <h2>Coaches Oxigen</h2>
            <p>Cada disciplina tiene su coach — conócelos antes de tu primera clase.</p>
          </div>
          <div className="grid cols-4 coach-grid reveal reveal-1">
            {coaches.map((co) => (
              <div key={co.id} className="coach-card">
                <img className="coach-photo" src={co.foto_url || '/images/hero.jpg'} alt={co.nombre} loading="lazy" decoding="async" />
                <div className="coach-name">{co.nombre}</div>
                <div className="coach-disciplinas">
                  {co.disciplinas.map((d) => (
                    <span key={d} className="disc-dot" style={{ background: disciplineTheme(d).color }} title={d} />
                  ))}
                  <span className="coach-disc-label">{co.disciplinas.join(' · ')}</span>
                </div>
                {co.bio && <p className="coach-bio">{co.bio}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Horarios ---------- */}
      <section id="horarios" className="calendar-section">
        <span className="blob" aria-hidden="true" />
        <div className="section-inner">
          <div className="section-head reveal">
            <span className="eyebrow">Horarios</span>
            <h2>Nuestra semana</h2>
            <p>El horario recurrente de cada semana — filtra por día y disciplina más arriba para reservar.</p>
          </div>
          <div className="schedule-grid reveal reveal-1">
            {HORARIO_SEMANA.map(({ dia, clases: horas }) => (
              <div key={dia} className="schedule-day">
                <div className="schedule-day-name">{dia}</div>
                <div className="schedule-slots">
                  {horas.map(([hora, disc]) => {
                    const theme = disciplineTheme(disc);
                    return (
                      <div key={hora + disc} className="schedule-slot" style={{ '--slot-color': theme.color }}>
                        <span className="schedule-hora">{hora}</span>
                        <span className="schedule-disc">{disc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Membresías ---------- */}
      <section id="membresias" className="disciplines">
        <span className="blob" aria-hidden="true" />
        <div className="section-inner">
          <div className="section-head center reveal">
            <span className="eyebrow">Membresías</span>
            <h2>Elige tu paquete</h2>
            <p>Entre más clases, mejor precio por clase — el precio Dúo aplica por persona, viniendo acompañada.</p>
          </div>
          <div className="pricing-table reveal reveal-1">
            <table>
              <thead>
                <tr><th>Clases</th><th>Individual</th><th>Dúo c/u</th></tr>
              </thead>
              <tbody>
                {MEMBRESIAS.map((m) => (
                  <tr key={m.clases}>
                    <td>{m.clases} {m.clases === 1 ? 'clase' : 'clases'}</td>
                    <td>{money(m.individual)}</td>
                    <td>{money(m.duo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---------- Comunidad ---------- */}
      <section className="community">
        <span className="blob" aria-hidden="true" />
        <div className="section-inner">
          <img className="reveal" src="/images/comunidad.jpg" alt="Comunidad de Oxigen Wellness Center practicando juntas" loading="lazy" decoding="async" />
          <div className="reveal reveal-1">
            <span className="eyebrow">Comunidad</span>
            <h2>No entrenas sola.</h2>
            <blockquote>“Un espacio para cuidarte, a tu ritmo, acompañada.”</blockquote>
            <p style={{ color: 'var(--ink-soft)' }}>
              En Oxigen creemos que cada cuerpo tiene su propio proceso. Nuestros coaches te acompañan
              desde tu primera clase — sin presión, sin comparaciones, con técnica y calidez.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Políticas ---------- */}
      <section id="politicas" className="calendar-section">
        <span className="blob" aria-hidden="true" />
        <div className="section-inner">
          <div className="section-head reveal">
            <span className="eyebrow">Políticas</span>
            <h2>Para que tu experiencia sea la mejor</h2>
            <p>Léelas antes de tu primera clase — nos ayudan a mantener el espacio a tiempo y en orden para todas.</p>
          </div>
          <div className="grid cols-2 policy-grid reveal reveal-1">
            <div className="card">
              <h4>Cancelaciones y cambios</h4>
              <p>Puedes cancelar o cambiar tu clase hasta <strong>4 horas antes</strong> sin costo. Si cancelas después
                de ese margen o no te presentas, cuenta como falta. Al acumular <strong>3 faltas</strong> se aplica
                una penalización de <strong>$85</strong> y tu membresía puede congelarse hasta regularizar tu situación.</p>
            </div>
            <div className="card">
              <h4>Puntualidad y horarios</h4>
              <p>El check-in cierra <strong>6 minutos</strong> después de la hora de inicio de la clase — pasado ese
                tiempo ya no se puede entrar, para no interrumpir a tus compañeras ni al coach. Llega con unos
                minutos de anticipación para prepararte con calma.</p>
            </div>
            <div className="card">
              <h4>Antes de tu clase</h4>
              <p>Trae ropa deportiva cómoda, tenis limpios (algunas disciplinas piden tenis exclusivos de estudio),
                toalla pequeña y tu botella de agua. Si tienes alguna condición de salud, lesión o estás embarazada,
                avísale a tu coach antes de empezar.</p>
            </div>
            <div className="card">
              <h4>Cuidemos el espacio</h4>
              <p>Al terminar tu clase, deja el equipo y tu área limpios y ordenados para la siguiente persona.
                Cualquier daño al equipo o instalaciones repórtalo de inmediato en recepción.</p>
            </div>
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
          <a href="#coaches">Coaches</a>
          <a href="#horarios">Horarios</a>
          <a href="#membresias">Membresías</a>
          <a href="#politicas">Políticas</a>
          <a href="/mi-cuenta/login">Mi cuenta</a>
        </div>
        Oxigen Wellness Center · Reserva sin cuenta, tu QR es tuyo para siempre.
      </footer>

      <BookingModal claseId={modalClaseId} onClose={() => setModalClaseId(null)} />
    </div>
  );
}
