import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet, apiPost } from '../../lib/apiClient.js';

const READER_ID = 'qr-reader';
const COOLDOWN_MS = 2600;

export default function Checkin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const claseId = searchParams.get('clase');

  const [clasesHoy, setClasesHoy] = useState([]);
  const [manualToken, setManualToken] = useState('');
  const [manualAbierto, setManualAbierto] = useState(false);
  const [resultado, setResultado] = useState(null); // { tipo, texto, qrToken? }
  const [procesando, setProcesando] = useState(false);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const scannerRef = useRef(null);
  const bloqueadoRef = useRef(false); // evita reenviar el mismo QR mientras sigue en cuadro
  const resumeTimerRef = useRef(null);
  const scannerStatePausedRef = useRef(3); // Html5QrcodeScannerState.PAUSED (se confirma al cargar la librería)

  useEffect(() => {
    apiGet('/staff/agenda-hoy').then(setClasesHoy).catch(() => {});
  }, []);

  const vibrar = (patron) => {
    if (navigator.vibrate) navigator.vibrate(patron);
  };

  const reanudarEscaneo = useCallback(() => {
    setResultado(null);
    bloqueadoRef.current = false;
    try {
      if (scannerRef.current?.isScanning && scannerRef.current.getState() === scannerStatePausedRef.current) {
        scannerRef.current.resume();
      }
    } catch { /* el scanner no llegó a iniciar (sin cámara) */ }
  }, []);

  const registrarCheckin = useCallback(
    async (qrToken, forzar = false) => {
      if (bloqueadoRef.current) return;
      bloqueadoRef.current = true;

      if (scannerRef.current?.isScanning) {
        try { scannerRef.current.pause(true); } catch { /* ignore */ }
      }

      if (!claseId) {
        setResultado({ tipo: 'error', texto: 'Elige primero la clase para hacer check-in.' });
        bloqueadoRef.current = false;
        return;
      }

      setProcesando(true);
      try {
        const data = await apiPost('/staff/checkin', { qrToken, claseId: Number(claseId), forzar });
        vibrar(60);
        setResultado({ tipo: 'success', titulo: '¡Completado!', texto: data.nombre });
        setManualToken('');
        resumeTimerRef.current = setTimeout(reanudarEscaneo, COOLDOWN_MS);
      } catch (err) {
        vibrar([40, 60, 40]);
        if (err.advertencia === 'fuera_de_ventana' && !forzar) {
          setResultado({ tipo: 'warning', texto: err.message, qrToken });
        } else {
          setResultado({ tipo: 'error', texto: err.message });
          resumeTimerRef.current = setTimeout(reanudarEscaneo, COOLDOWN_MS);
        }
      } finally {
        setProcesando(false);
      }
    },
    [claseId, reanudarEscaneo]
  );

  // Escáner de cámara — degrada con gracia si no hay cámara o el usuario no da permiso.
  useEffect(() => {
    let activo = true;
    let instancia = null;

    import('html5-qrcode')
      .then(({ Html5Qrcode, Html5QrcodeScannerState }) => {
        if (!activo) return;
        scannerStatePausedRef.current = Html5QrcodeScannerState.PAUSED;
        instancia = new Html5Qrcode(READER_ID);
        scannerRef.current = instancia;
        return instancia
          .start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: 230 },
            (texto) => registrarCheckin(texto.trim()),
            () => {}
          )
          .then(() => setCamaraActiva(true))
          .catch(() => setCamaraActiva(false));
      })
      .catch(() => setCamaraActiva(false));

    return () => {
      activo = false;
      clearTimeout(resumeTimerRef.current);
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
    <div className="page" style={{ maxWidth: 460, margin: '0 auto' }}>
      <span className="eyebrow">Recepción</span>
      <h1>Check-in</h1>

      <div className="field">
        <label htmlFor="clase">Clase</label>
        <select
          id="clase"
          value={claseId || ''}
          onChange={(e) => { setSearchParams(e.target.value ? { clase: e.target.value } : {}); reanudarEscaneo(); }}
        >
          <option value="">Selecciona una clase de hoy…</option>
          {clasesHoy.map((c) => (
            <option key={c.id} value={c.id}>
              {c.hora_inicio?.slice(0, 5)} · {c.disciplina_nombre} · {c.coach_nombre}
            </option>
          ))}
        </select>
      </div>

      <div className={`scanner-frame ${resultado ? `is-${resultado.tipo}` : ''}`}>
        <div id={READER_ID} className="scanner-video" />
        {!resultado && camaraActiva && <div className="scanner-corners" aria-hidden="true" />}

        {!camaraActiva && !resultado && (
          <div className="scanner-fallback">Activando cámara… si no aparece, usa el código manual abajo.</div>
        )}

        {resultado && (
          <div className="scanner-result">
            <span className="scanner-result-icon pop" aria-hidden="true">
              {resultado.tipo === 'success' ? '✓' : resultado.tipo === 'warning' ? '!' : '✕'}
            </span>
            {resultado.titulo && <p className="scanner-result-title">{resultado.titulo}</p>}
            <p className="scanner-result-text">{resultado.texto}</p>
            {resultado.tipo === 'warning' && resultado.qrToken ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => registrarCheckin(resultado.qrToken, true)}>
                  Registrar de todas formas
                </button>
                <button className="btn btn-ghost" onClick={reanudarEscaneo}>Cancelar</button>
              </div>
            ) : (
              <button className="btn btn-secondary" onClick={reanudarEscaneo}>Escanear siguiente</button>
            )}
          </div>
        )}
      </div>

      <button
        className="btn btn-ghost btn-block"
        style={{ marginTop: 10, fontSize: 13 }}
        onClick={() => setManualAbierto((v) => !v)}
      >
        {manualAbierto ? 'Ocultar código manual' : '¿Problemas con la cámara? Ingresa el código manualmente'}
      </button>

      {manualAbierto && (
        <form onSubmit={onManualSubmit} className="card" style={{ marginTop: 10 }}>
          <div className="field">
            <label htmlFor="token">Código QR (manual)</label>
            <input id="token" value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder="Pega o escribe el código" />
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={procesando}>Registrar asistencia</button>
        </form>
      )}
    </div>
  );
}
