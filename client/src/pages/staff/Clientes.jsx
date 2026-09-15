import { Fragment, useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTour } from '../../lib/useTour.js';
import TourOverlay from '../../components/TourOverlay.jsx';
import TourButton from '../../components/TourButton.jsx';
import CumpleanosFields from '../../components/CumpleanosFields.jsx';

const FORM_VACIO = { id: null, nombre: '', whatsapp: '', email: '', notasInternas: '', estado: 'activo', cumpleMes: null, cumpleDia: null };
const NUEVO_VACIO = { nombre: '', whatsapp: '', email: '', notasInternas: '', cumpleMes: null, cumpleDia: null };
const ESTADO_RESERVA_LABEL = { confirmada: 'success', lista_espera: 'warning', cancelada: 'critical' };

const TOUR_STEPS = [
  {
    selector: '[data-tour="clientes-buscar"]',
    title: 'Buscar un cliente',
    body: 'Escribe parte del nombre o del WhatsApp — se filtra automáticamente mientras escribes.',
  },
  {
    selector: '[data-tour="clientes-columnas"]',
    title: 'Clases tomadas vs. Reservas',
    body: '"Clases tomadas" son las que realmente asistió (check-in). "Reservas" cuenta todas sus reservas, aunque no haya venido o siga pendiente.',
  },
  {
    selector: '[data-tour="clientes-demo-acceso"]',
    title: 'Crear acceso al portal',
    body: 'Le da al cliente su usuario para "Mi cuenta" (entra con su WhatsApp y la contraseña que definas aquí) — ahí ve su QR, su historial y su recompensa.',
  },
];

export default function Clientes() {
  const { user } = useAuth();
  const esAdmin = user.rol === 'administrador';
  const [clientes, setClientes] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [form, setForm] = useState(null); // null = cerrado
  const [nuevo, setNuevo] = useState(null); // null = formulario cerrado
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [soloSinCuenta, setSoloSinCuenta] = useState(false);
  const [historialCliente, setHistorialCliente] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [historialCargando, setHistorialCargando] = useState(false);
  const [fusion, setFusion] = useState(null); // null = cerrado
  const [expandido, setExpandido] = useState(null); // id del cliente con el desplegable abierto
  const tour = useTour('clientes', TOUR_STEPS);

  function cargar() {
    setCargando(true);
    const params = buscar.trim() ? `?buscar=${encodeURIComponent(buscar.trim())}` : '';
    apiGet(`/staff/clientes${params}`)
      .then((data) => { setClientes(data); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }

  async function crearCliente(e) {
    e.preventDefault();
    setGuardandoNuevo(true);
    try {
      await apiPost('/staff/clientes', nuevo);
      setNuevo(null);
      setMensaje(`${nuevo.nombre} fue registrado.`);
      cargar();
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardandoNuevo(false);
    }
  }

  const clientesFiltrados = soloSinCuenta ? clientes.filter((c) => !c.tiene_acceso) : clientes;
  const clientesOrdenados = [...clientesFiltrados].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscar]);

  async function crearAcceso(c) {
    const password = window.prompt(`Contraseña para ${c.nombre} (mínimo 4 caracteres) — el usuario para entrar es su WhatsApp: ${c.whatsapp}`);
    if (!password) return;
    try {
      await apiPost(`/staff/clientes/${c.id}/crear-acceso`, { password });
      setMensaje(`Acceso creado para ${c.nombre}. Ya puede entrar en "Mi cuenta" con su WhatsApp y esa contraseña.`);
      cargar();
    } catch (err) {
      alert(err.message);
    }
  }

  async function editar(c) {
    const data = await apiGet(`/admin/clientes/${c.id}`);
    setForm({
      id: data.id,
      nombre: data.nombre,
      whatsapp: data.whatsapp,
      email: data.email || '',
      notasInternas: data.notas_internas || '',
      estado: data.estado,
      cumpleMes: data.cumple_mes,
      cumpleDia: data.cumple_dia,
    });
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    try {
      await apiPut(`/admin/clientes/${form.id}`, form);
      setForm(null);
      setMensaje('Datos del cliente actualizados.');
      cargar();
    } catch (err) {
      alert(err.message);
    }
  }

  function verHistorial(c) {
    setHistorialCliente(c);
    setHistorialCargando(true);
    apiGet(`/staff/clientes/${c.id}/reservas`)
      .then(setHistorial)
      .catch(() => setHistorial([]))
      .finally(() => setHistorialCargando(false));
  }

  async function borrar(c) {
    if (!confirm(`¿Borrar por completo a ${c.nombre}? Esto también borra su historial de reservas y check-ins. No se puede deshacer.`)) return;
    try {
      await apiDelete(`/admin/clientes/${c.id}`);
      setMensaje(`${c.nombre} fue borrado.`);
      cargar();
    } catch (err) {
      alert(err.message);
    }
  }

  function abrirFusion(c) {
    // Se busca por WhatsApp, no por nombre: si el duplicado tiene un nombre distinto (ej. "Iliana
    // Lazcano" vs "Iliana Mireya Lazcano Vázquez"), buscar por nombre nunca lo iba a encontrar.
    setFusion({ origen: c, buscar: c.whatsapp, candidatos: [], cargando: true, fusionando: false });
    buscarCandidatos(c.whatsapp);
  }

  function buscarCandidatos(texto) {
    setFusion((f) => (f ? { ...f, buscar: texto, cargando: true } : f));
    apiGet(`/staff/clientes?buscar=${encodeURIComponent(texto.trim())}`)
      .then((data) => setFusion((f) => (f ? { ...f, candidatos: data, cargando: false } : f)))
      .catch(() => setFusion((f) => (f ? { ...f, candidatos: [], cargando: false } : f)));
  }

  async function conservarEste(mantener) {
    const grupo = [fusion.origen, ...fusion.candidatos.filter((c) => c.id !== fusion.origen.id)];
    const otros = grupo.filter((c) => c.id !== mantener.id);
    if (otros.length === 0) return;
    if (!confirm(`Vas a conservar a "${mantener.nombre}" (${mantener.whatsapp}) y fusionar en él a: ${otros.map((o) => `"${o.nombre}" (${o.whatsapp})`).join(', ')}.\n\nSe combinan sus reservas, historial y datos — los perfiles fusionados se borran. No se puede deshacer. ¿Continuar?`)) return;

    setFusion((f) => ({ ...f, fusionando: true }));
    try {
      for (const o of otros) {
        await apiPost(`/admin/clientes/${mantener.id}/fusionar`, { eliminarId: o.id });
      }
      setMensaje(`Se fusionaron ${otros.length} perfil${otros.length === 1 ? '' : 'es'} en "${mantener.nombre}".`);
      setFusion(null);
      cargar();
    } catch (err) {
      alert(err.message);
      setFusion((f) => ({ ...f, fusionando: false }));
    }
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <span className="eyebrow">Clientes</span>
          <h1>Personas registradas</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Se crean automáticamente en su primera reserva, pero también puedes registrar aquí a quien pague o
            se apunte sin escanear el QR. Aquí ves quién se ha registrado, cuántas clases ha tomado, y puedes
            darle acceso a su propia cuenta.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <button className="btn btn-primary" type="button" onClick={() => setNuevo(NUEVO_VACIO)}>Nuevo cliente</button>
          <TourButton tour={tour} />
        </div>
      </div>

      {nuevo && (
        <form onSubmit={crearCliente} className="card" style={{ marginBottom: 20, maxWidth: 480 }}>
          <h3 style={{ marginTop: 0 }}>Registrar cliente manualmente</h3>
          <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: -6 }}>
            Para alguien que ya está en el estudio o pagó, pero no reservó por el sitio ni escaneó nada todavía.
          </p>
          <div className="field">
            <label htmlFor="n-nombre">Nombre</label>
            <input id="n-nombre" required value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="n-whatsapp">WhatsApp</label>
            <input id="n-whatsapp" required value={nuevo.whatsapp} onChange={(e) => setNuevo({ ...nuevo, whatsapp: e.target.value })} placeholder="7351234567" />
          </div>
          <div className="field">
            <label htmlFor="n-email">Correo (opcional)</label>
            <input id="n-email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="n-notas">Notas internas (opcional)</label>
            <textarea id="n-notas" rows={2} value={nuevo.notasInternas} onChange={(e) => setNuevo({ ...nuevo, notasInternas: e.target.value })} />
          </div>
          <CumpleanosFields
            idPrefix="n-cumple"
            mes={nuevo.cumpleMes}
            dia={nuevo.cumpleDia}
            onChangeMes={(cumpleMes) => setNuevo({ ...nuevo, cumpleMes })}
            onChangeDia={(cumpleDia) => setNuevo({ ...nuevo, cumpleDia })}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={guardandoNuevo}>Registrar</button>
            <button type="button" className="btn btn-secondary" onClick={() => setNuevo(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="field" style={{ maxWidth: 320 }} data-tour="clientes-buscar">
        <label htmlFor="buscar">Buscar por nombre o WhatsApp</label>
        <input id="buscar" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Ej. María, 55…" />
      </div>

      <div className="chip-row">
        <span className={`chip ${!soloSinCuenta ? 'active' : ''}`} onClick={() => setSoloSinCuenta(false)}>Todos</span>
        <span className={`chip ${soloSinCuenta ? 'active' : ''}`} onClick={() => setSoloSinCuenta(true)}>Sin cuenta todavía</span>
      </div>

      {mensaje && <div className="alert success">{mensaje}</div>}
      {error && <div className="alert error">{error}</div>}
      {cargando && <div className="page-loading">Cargando…</div>}

      {tour.active && (
        <div data-tour="clientes-demo-acceso" className="card" style={{ marginBottom: 18, maxWidth: 480 }}>
          <span className="tour-demo-pill">Ejemplo</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <strong>Cliente de prueba</strong>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--ink-soft)' }}>7351234567 · sin acceso todavía</p>
            </div>
            <button className="btn btn-secondary" type="button" disabled>Crear acceso</button>
          </div>
        </div>
      )}

      {form && (
        <form onSubmit={guardarEdicion} className="card" style={{ marginBottom: 20, maxWidth: 480 }}>
          <h3 style={{ marginTop: 0 }}>Editar cliente</h3>
          <div className="field">
            <label htmlFor="e-nombre">Nombre</label>
            <input id="e-nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="e-whatsapp">WhatsApp</label>
            <input id="e-whatsapp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="e-email">Correo</label>
            <input id="e-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="e-estado">Estado</label>
            <select id="e-estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="e-notas">Notas internas</label>
            <textarea id="e-notas" rows={2} value={form.notasInternas} onChange={(e) => setForm({ ...form, notasInternas: e.target.value })} />
          </div>
          <CumpleanosFields
            idPrefix="e-cumple"
            mes={form.cumpleMes}
            dia={form.cumpleDia}
            onChangeMes={(cumpleMes) => setForm({ ...form, cumpleMes })}
            onChangeDia={(cumpleDia) => setForm({ ...form, cumpleDia })}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" type="submit">Guardar cambios</button>
            <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <table className="responsive">
        <thead data-tour="clientes-columnas">
          <tr>
            <th style={{ width: 60 }}>ID</th><th>Nombre</th><th style={{ width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {clientesOrdenados.map((c) => (
            <Fragment key={c.id}>
              <tr onClick={() => setExpandido((id) => (id === c.id ? null : c.id))} style={{ cursor: 'pointer' }}>
                <td data-label="ID">#{c.id}</td>
                <td data-label="Nombre">
                  {c.nombre}{' '}
                  {c.tiene_acceso ? <span className="pill success" style={{ marginLeft: 6 }}>acceso</span> : null}
                </td>
                <td style={{ textAlign: 'right', color: 'var(--ink-faint)' }}>{expandido === c.id ? '▲' : '▼'}</td>
              </tr>
              {expandido === c.id && (
                <tr>
                  <td colSpan={3} style={{ background: 'var(--surface-soft, rgba(0,0,0,0.02))' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, padding: '10px 4px' }}>
                      <div><strong>WhatsApp</strong><br />{c.whatsapp}</div>
                      <div><strong>Correo</strong><br />{c.email || '—'}</div>
                      <div><strong>Cumpleaños</strong><br />{c.cumple_dia && c.cumple_mes ? `${String(c.cumple_dia).padStart(2, '0')}/${String(c.cumple_mes).padStart(2, '0')}` : '—'}</div>
                      <div><strong>Clases tomadas</strong><br /><span className="pill success">{c.clases_tomadas}</span></div>
                      <div><strong>Reservas</strong><br /><span className="pill accent">{c.reservas_total}</span></div>
                      <div><strong>Registrado</strong><br />{new Date(c.created_at).toLocaleDateString('es-MX')}</div>
                      <div><strong>Cuenta</strong><br />{c.tiene_acceso ? <span className="pill success">tiene acceso</span> : <span className="pill warning">sin acceso</span>}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 4px 10px' }}>
                      <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => verHistorial(c)}>Ver reservas</button>
                      <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => crearAcceso(c)}>
                        {c.tiene_acceso ? 'Cambiar contraseña' : 'Crear acceso'}
                      </button>
                      {esAdmin && (
                        <>
                          <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => editar(c)}>Editar</button>
                          <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => abrirFusion(c)}>Fusionar duplicado</button>
                          <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5, color: 'var(--critical)' }} onClick={() => borrar(c)}>Borrar</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      {!cargando && clientesFiltrados.length === 0 && (
        <div className="empty-state">{soloSinCuenta ? 'Todos los que aparecen ya tienen cuenta.' : 'No se encontró nadie con ese criterio.'}</div>
      )}

      {historialCliente && (
        <div className="modal-backdrop" onClick={() => setHistorialCliente(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <button className="modal-close" onClick={() => setHistorialCliente(null)} aria-label="Cerrar">✕</button>
            <h3 style={{ marginTop: 0 }}>Reservas de {historialCliente.nombre}</h3>

            {historialCargando && <div className="page-loading">Cargando…</div>}
            {!historialCargando && historial.length === 0 && (
              <p style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>Todavía no tiene reservas.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
              {historial.map((r) => (
                <div
                  key={r.reserva_id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                    border: '1px solid var(--line)', borderLeft: `4px solid ${r.disciplina_color || 'var(--accent)'}`,
                    borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                  }}
                >
                  <span>
                    <strong>{r.fecha}</strong> {r.hora_inicio?.slice(0, 5)} · {r.disciplina_nombre} · {r.coach_nombre}
                  </span>
                  <span className={`pill ${r.asistio ? 'success' : ESTADO_RESERVA_LABEL[r.estado] || 'accent'}`}>
                    {r.asistio ? 'asistió' : r.estado === 'lista_espera' ? `espera Nº${r.posicion_espera}` : r.estado}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {fusion && (
        <div className="modal-backdrop" onClick={() => !fusion.fusionando && setFusion(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <button className="modal-close" onClick={() => setFusion(null)} aria-label="Cerrar" disabled={fusion.fusionando}>✕</button>
            <h3 style={{ marginTop: 0 }}>Fusionar duplicados</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Busca los perfiles que crees que son la misma persona (por nombre o WhatsApp) y elige cuál conservar —
              los demás se fusionan en él (se combinan sus reservas e historial) y se borran. No se puede deshacer.
            </p>
            <div className="field">
              <label htmlFor="fusion-buscar">Buscar por nombre o WhatsApp</label>
              <input
                id="fusion-buscar"
                value={fusion.buscar}
                onChange={(e) => buscarCandidatos(e.target.value)}
                disabled={fusion.fusionando}
              />
            </div>

            {fusion.cargando && <div className="page-loading">Buscando…</div>}

            {!fusion.cargando && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                {[fusion.origen, ...fusion.candidatos.filter((c) => c.id !== fusion.origen.id)].map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                      border: c.id === fusion.origen.id ? '1px solid var(--accent)' : '1px solid var(--line)',
                      borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                    }}
                  >
                    <span>
                      <strong>{c.nombre}</strong> · {c.whatsapp}
                      {c.id === fusion.origen.id && <span className="pill accent" style={{ marginLeft: 6 }}>este</span>}
                      <br />
                      <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                        {c.tiene_acceso ? 'tiene acceso' : 'sin acceso'} · {c.reservas_total ?? '—'} reservas · registrado {new Date(c.created_at).toLocaleDateString('es-MX')}
                      </span>
                    </span>
                    <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => conservarEste(c)} disabled={fusion.fusionando}>
                      Conservar este
                    </button>
                  </div>
                ))}
                {fusion.candidatos.filter((c) => c.id !== fusion.origen.id).length === 0 && (
                  <p style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>No se encontró ningún otro perfil parecido — puede que no haya duplicado.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <TourOverlay tour={tour} />
    </div>
  );
}
