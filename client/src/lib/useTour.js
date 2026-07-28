import { useEffect, useState } from 'react';

// Motor genérico de tutorial guiado por módulo. Cada página lo usa con su propio
// "id" (clave de guardado) y su propia lista de pasos — un paso apunta a un
// elemento del DOM (selector CSS, normalmente un data-tour="...") con un título
// y un texto. La primera vez que se visita un módulo se ofrece solo; después de
// terminarlo o saltarlo, no vuelve a aparecer solo (queda en localStorage de
// este navegador) — el botón "Activar tutorial" siempre lo puede volver a abrir.
export function useTour(id, steps) {
  const storageKey = `oxigen_tour_${id}`;
  const [stepIndex, setStepIndex] = useState(-1);
  const [, forceTick] = useState(0);

  useEffect(() => {
    let visto;
    try { visto = localStorage.getItem(storageKey); } catch { visto = '1'; }
    if (!visto) {
      const t = setTimeout(() => setStepIndex(0), 500);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  useEffect(() => {
    if (stepIndex < 0) return;
    function onResize() { forceTick((n) => n + 1); }
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [stepIndex]);

  function marcarVisto() {
    try { localStorage.setItem(storageKey, '1'); } catch { /* localStorage no disponible */ }
  }

  function start() { setStepIndex(0); }
  function finish() { marcarVisto(); setStepIndex(-1); }
  function skip() { finish(); }
  function next() {
    if (stepIndex >= steps.length - 1) finish();
    else setStepIndex((i) => i + 1);
  }
  function prev() { setStepIndex((i) => Math.max(0, i - 1)); }

  return {
    active: stepIndex >= 0,
    stepIndex,
    step: stepIndex >= 0 ? steps[stepIndex] : null,
    total: steps.length,
    start,
    next,
    prev,
    skip,
  };
}
