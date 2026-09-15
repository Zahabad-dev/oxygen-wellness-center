// Cumpleaños del cliente para la recompensa de la comunidad — a propósito solo mes y día,
// nunca año (evita pedir de más y que se sientan vigilados). No lanza: regresa un `error`
// para que cada ruta decida cómo responder (la mayoría de este server no usa err.status).
export function parseCumple(cumpleMes, cumpleDia) {
  if (cumpleMes == null && cumpleDia == null && cumpleMes !== 0 && cumpleDia !== 0) {
    return { mes: null, dia: null, error: null };
  }

  const mes = Number(cumpleMes);
  const dia = Number(cumpleDia);
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(dia) || dia < 1 || dia > 31) {
    return { mes: null, dia: null, error: 'La fecha de cumpleaños no es válida — usa mes y día reales, sin año.' };
  }
  return { mes, dia, error: null };
}
