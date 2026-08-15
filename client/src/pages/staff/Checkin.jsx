import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiGet, apiPost } from '../../lib/apiClient.js';
import { useTour } from '../../lib/useTour.js';
import TourOverlay from '../../components/TourOverlay.jsx';
import TourButton from '../../components/TourButton.jsx';

const READER_ID = 'qr-reader';
const COOLDOWN_MS = 2600;

const TOUR_STEPS = [
  {
    selector: '[data-tour="checkin-select"]',
    title: 'Elige la clase',
    body: 'Primero selecciona a qué clase de hoy le vas a hacer check-in — el escáner y el código manual registran la asistencia para esa clase.',
  },
  {
    selector: '[data-tour="checkin-scanner"]',
    title: 'Escáner de cámara',
    body: 'Apunta la cámara al código QR del cliente (el que le llega al reservar). Se registra solo, sin tocar nada más.',
  },
  {
    selector: '[data-tour="checkin-manual-btn"]',
    title: 'Código manual de respaldo',
    body: 'Si la cámara falla o el celular del cliente no abre, puedes escribir o pegar aquí el código de su QR.',
  },
  {
    selector: '[data-tour="checkin-demo-estados"]',
    title: 'Qué significa cada resultado',
    body: 'Verde: registrado. Amarillo: llegó fuera del horario permitido de check-in — puedes "Registrar de todas formas" si decides dejarlo pasar. Rojo: hubo un error (QR no reconocido, clase llena, etc.).',
  },
];

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
  const tour = useTour('checkin', TOUR_STEPS);

  useEffect(() => {
    apiGet('/staff/agenda-hoy').then(setClasesHoy).catch(() => {});
  }, []);

  const vibrar = (patron) => {
    if (navigator.vibrate) navigator.vibrate(patron);
  };

  const reanudarEscaneo = useCallback(() => {
    clearTimeout(resumeTimerRef.current);
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
      clearTimeout(resumeTimerRef.current);

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
          // Libera el candado: si no, "Registrar de todas formas" queda mudo hasta el timeout.
          bloqueadoRef.current = false;
          // Respaldo: si nadie decide en 20s, no se queda trabado — vuelve a escanear solo.
          resumeTimerRef.current = setTimeout(reanudarEscaneo, 20000);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <span className="eyebrow">Recepción</span>
          <h1>Check-in</h1>
        </div>
        <TourButton tour={tour} />
      </div>

      <div className="field" data-tour="checkin-select">
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

      <div data-tour="checkin-scanner" className={`scanner-frame ${resultado ? `is-${resultado.tipo}` : ''}`}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                <button className="btn btn-primary btn-block" onClick={() => registrarCheckin(resultado.qrToken, true)}>
                  Registrar de todas formas
                </button>
                <button className="btn btn-secondary btn-block" onClick={reanudarEscaneo}>Cancelar y escanear otro</button>
              </div>
            ) : (
              <button className="btn btn-secondary" onClick={reanudarEscaneo}>Escanear siguiente</button>
            )}
          </div>
        )}
      </div>

      <button
        data-tour="checkin-manual-btn"
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

      {tour.active && (
        <div data-tour="checkin-demo-estados" className="card" style={{ marginTop: 14 }}>
          <span className="tour-demo-pill">Ejemplo</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="scanner-result-icon" style={{ position: 'static', width: 32, height: 32, fontSize: 16, background: 'var(--success)' }}>✓</span>
              <span style={{ fontSize: 13 }}>Registrado correctamente.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="scanner-result-icon" style={{ position: 'static', width: 32, height: 32, fontSize: 16, background: 'var(--warning)' }}>!</span>
              <span style={{ fontSize: 13 }}>Fuera del horario de check-in — puedes forzarlo.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="scanner-result-icon" style={{ position: 'static', width: 32, height: 32, fontSize: 16, background: 'var(--critical)' }}>✕</span>
              <span style={{ fontSize: 13 }}>Error (QR no reconocido, clase llena, etc.).</span>
            </div>
          </div>
        </div>
      )}

      <TourOverlay tour={tour} />
    </div>
  );
}
