import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { waLink, mensajeSeguimiento } from '../../lib/whatsapp.js';
import { useTour } from '../../lib/useTour.js';
import TourOverlay from '../../components/TourOverlay.jsx';
import TourButton from '../../components/TourButton.jsx';

const ESTADO_LABEL = {
  confirmada: { text: 'confirmada', className: 'success' },
  lista_espera: { text: 'lista de espera', className: 'warning' },
  asistio: { text: 'asistió', className: 'accent' },
};

const TOUR_STEPS = [
  {
    selector: '[data-tour="agenda-header"]',
    title: 'Agenda de hoy',
    body: 'Aquí ves todas las clases del día (o solo las tuyas si eres coach), con su horario, coach, salón y cupo.',
  },
  {
    selector: '[data-tour="agenda-demo-seguimiento"]',
    title: 'Seguimiento a clientes nuevos',
    body: 'Cuando un cliente reserva por primera vez y su clase está por empezar (2 horas antes), aparece aquí para recordarte darle la bienvenida. El botón abre WhatsApp con un mensaje ya escrito — tú solo lo envías.',
  },
  {
    selector: '[data-tour="agenda-demo-clase"]',
    title: 'Tarjeta de clase',
    body: 'Cada clase muestra disciplina, hora, coach, salón y cuántos lugares están ocupados. El botón "Check-in" te lleva directo al escáner con esa clase ya seleccionada.',
  },
  {
    selector: '[data-tour="agenda-demo-roster"]',
    title: 'Lista de asistentes',
    body: 'Debajo de cada clase ves quién tiene reserva, su WhatsApp y su estado: confirmada, lista de espera o ya asistió.',
  },
];

export default function AgendaHoy() {
  const { user } = useAuth();
  const [clases, setClases] = useState([]);
  const [seguimientos, setSeguimientos] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const tour = useTour('agenda', TOUR_STEPS);

  useEffect(() => {
    apiGet('/staff/agenda-hoy')
      .then(setClases)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!['administrador', 'recepcion'].includes(user.rol)) return;
    function cargarSeguimientos() {
      apiGet('/staff/seguimientos').then(setSeguimientos).catch(() => {});
    }
    cargarSeguimientos();
    const id = setInterval(cargarSeguimientos, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [user.rol]);

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div data-tour="agenda-header">
          <span className="eyebrow">Hoy</span>
          <h1>Agenda de hoy</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            {user.rol === 'coach' ? 'Tus clases de hoy.' : 'Todas las clases del centro.'}
          </p>
        </div>
        <TourButton tour={tour} />
      </div>

      {tour.active && (
        <>
          <div data-tour="agenda-demo-seguimiento" className="alert warning" style={{ marginBottom: 18 }}>
            <span className="tour-demo-pill">Ejemplo</span>
            <br />
            <strong>Seguimiento a clientes nuevos:</strong> tienes 1 cliente nuevo con clase en las próximas 2 horas — dales la bienvenida por WhatsApp antes de que lleguen.
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                <span><strong>Cliente de prueba</strong> · Funcional a las 18:00</span>
                <button className="btn btn-primary" type="button" disabled>Enviar seguimiento por WhatsApp</button>
              </div>
            </div>
          </div>

          <div data-tour="agenda-demo-clase" className="card" style={{ marginBottom: 14 }}>
            <span className="tour-demo-pill">Ejemplo</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="disc-dot" style={{ background: 'var(--accent)' }} />
                  <strong>Funcional</strong>
                  <span className="pill accent">18:00</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                  Coach de prueba · Salón A · 6/10
                </p>
              </div>
              <button className="btn btn-primary" type="button" disabled>Check-in</button>
            </div>

            <table className="responsive" style={{ marginTop: 12 }} data-tour="agenda-demo-roster">
              <thead><tr><th>Cliente</th><th>WhatsApp</th><th>Estado</th></tr></thead>
              <tbody>
                <tr>
                  <td data-label="Cliente">Cliente de prueba</td>
                  <td data-label="WhatsApp">7351234567</td>
                  <td data-label="Estado"><span className="pill success">confirmada</span></td>
                </tr>
                <tr>
                  <td data-label="Cliente">Otro cliente</td>
                  <td data-label="WhatsApp">7359876543</td>
                  <td data-label="Estado"><span className="pill warning">lista de espera Nº1</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {seguimientos.length > 0 && (
        <div className="alert warning" style={{ marginBottom: 18 }}>
          <strong>Seguimiento a clientes nuevos:</strong> {seguimientos.length === 1 ? 'tienes 1 cliente nuevo' : `tienes ${seguimientos.length} clientes nuevos`} con clase en las próximas 2 horas — dales la bienvenida por WhatsApp antes de que lleguen.
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {seguimientos.map((s) => (
              <div key={s.reserva_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                <span>
                  <strong>{s.nombre}</strong> · {s.disciplina_nombre} a las {s.hora_inicio?.slice(0, 5)}
                </span>
                <a
                  className="btn btn-primary"
                  href={waLink(s.whatsapp, mensajeSeguimiento(s))}
                  target="_blank"
                  rel="noreferrer"
                >
                  Enviar seguimiento por WhatsApp
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="alert error">{error}</div>}
      {cargando && <div className="page-loading">Cargando…</div>}
      {!cargando && clases.length === 0 && <div className="card">No hay clases programadas para hoy.</div>}

      {clases.map((c) => (
        <div key={c.id} className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="disc-dot" style={{ background: c.disciplina_color }} />
                <strong>{c.disciplina_nombre}</strong>
                <span className="pill accent">{c.hora_inicio?.slice(0, 5)}</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                {c.coach_nombre} · {c.salon_nombre} · {c.roster.length}/{c.capacidad_maxima}
              </p>
            </div>
            <Link className="btn btn-primary" to={`/staff/checkin?clase=${c.id}`}>Check-in</Link>
          </div>

          {c.roster.length > 0 && (
            <table className="responsive" style={{ marginTop: 12 }}>
              <thead><tr><th>Cliente</th><th>WhatsApp</th><th>Estado</th></tr></thead>
              <tbody>
                {c.roster.map((r) => {
                  const estado = ESTADO_LABEL[r.estado] || { text: r.estado, className: 'accent' };
                  return (
                    <tr key={r.reservaId}>
                      <td data-label="Cliente">{r.nombre}</td>
                      <td data-label="WhatsApp">{r.whatsapp}</td>
                      <td data-label="Estado">
                        <span className={`pill ${estado.className}`}>
                          {estado.text}{r.estado === 'lista_espera' ? ` Nº${r.posicionEspera}` : ''}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}

      <TourOverlay tour={tour} />
    </div>
  );
}
