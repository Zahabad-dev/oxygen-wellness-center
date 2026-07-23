import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet, apiPost } from '../../lib/apiClient.js';

const READER_ID = 'qr-reader';

export default function Checkin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const claseId = searchParams.get('clase');

  const [clasesHoy, setClasesHoy] = useState([]);
  const [manualToken, setManualToken] = useState('');
  const [mensaje, setMensaje] = useState(null); // { tipo: 'success'|'error'|'warning', texto }
  const [pendienteForzar, setPendienteForzar] = useState(null); // qrToken en espera de confirmación
  const [camaraActiva, setCamaraActiva] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    apiGet('/staff/agenda-hoy').then(setClasesHoy).catch(() => {});
  }, []);

  const registrarCheckin = useCallback(
    async (qrToken, forzar = false) => {
      if (!claseId) {
        setMensaje({ tipo: 'error', texto: 'Elige primero la clase para hacer check-in.' });
        return;
      }
      try {
        const data = await apiPost('/staff/checkin', { qrToken, claseId: Number(claseId), forzar });
        setMensaje({ tipo: 'success', texto: `Check-in registrado: ${data.nombre}` });
        setPendienteForzar(null);
        setManualToken('');
      } catch (err) {
        if (err.advertencia === 'fuera_de_ventana' && !forzar) {
          setPendienteForzar(qrToken);
          setMensaje({ tipo: 'warning', texto: err.message });
        } else {
          setMensaje({ tipo: 'error', texto: err.message });
        }
      }
    },
    [claseId]
  );

  // Escáner de cámara — degrada con gracia si no hay cámara o el usuario no da permiso.
  useEffect(() => {
    let activo = true;
    let instancia = null;

    import('html5-qrcode')
      .then(({ Html5Qrcode }) => {
        if (!activo) return;
        instancia = new Html5Qrcode(READER_ID);
        scannerRef.current = instancia;
        return instancia
          .start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 220 },
            (texto) => registrarCheckin(texto.trim()),
            () => {}
          )
          .then(() => setCamaraActiva(true))
          .catch(() => setCamaraActiva(false));
      })
      .catch(() => setCamaraActiva(false));

    return () => {
      activo = false;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claseId]);

  function onManualSubmit(e) {
    e.preventDefault();
    if (manualToken.trim()) registrarCheckin(manualToken.trim());
  }

  return (
    <div style={{ maxWidth: 460, margin: '0 auto' }}>
      <span className="eyebrow">Recepción</span>
      <h1>Check-in</h1>

      <div className="field">
        <label htmlFor="clase">Clase</label>
        <select
          id="clase"
          value={claseId || ''}
          onChange={(e) => setSearchParams(e.target.value ? { clase: e.target.value } : {})}
        >
          <option value="">Selecciona una clase de hoy…</option>
          {clasesHoy.map((c) => (
            <option key={c.id} value={c.id}>
              {c.hora_inicio?.slice(0, 5)} · {c.disciplina_nombre} · {c.coach_nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div id={READER_ID} style={{ width: '100%', maxWidth: 320, margin: '0 auto', borderRadius: 10, overflow: 'hidden' }} />
        {!camaraActiva && (
          <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 10 }}>
            No se pudo activar la cámara — usa el código manual de abajo.
          </p>
        )}
      </div>

      <form onSubmit={onManualSubmit} className="card" style={{ marginTop: 14 }}>
        <div className="field">
          <label htmlFor="token">Código QR (manual)</label>
          <input id="token" value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder="Pega o escribe el código" />
        </div>
        <button className="btn btn-primary btn-block" type="submit">Registrar asistencia</button>
      </form>

      {mensaje && (
        <div className={`alert ${mensaje.tipo}`} style={{ marginTop: 14 }}>
          {mensaje.texto}
          {mensaje.tipo === 'warning' && pendienteForzar && (
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => registrarCheckin(pendienteForzar, true)}>
                Registrar de todas formas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
