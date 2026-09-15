const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Cumpleaños del cliente: a propósito solo mes y día, nunca año — para la recompensa de
// cumpleaños de la comunidad, sin dar la impresión de que se pide de más.
export default function CumpleanosFields({ idPrefix, mes, dia, onChangeMes, onChangeDia }) {
  return (
    <div className="field">
      <label htmlFor={`${idPrefix}-mes`}>Cumpleaños (opcional, sin año)</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          id={`${idPrefix}-mes`}
          value={mes ?? ''}
          onChange={(e) => onChangeMes(e.target.value ? Number(e.target.value) : null)}
          style={{ flex: 2 }}
        >
          <option value="">Mes…</option>
          {MESES.map((nombre, i) => (
            <option key={nombre} value={i + 1}>{nombre}</option>
          ))}
        </select>
        <select
          id={`${idPrefix}-dia`}
          value={dia ?? ''}
          onChange={(e) => onChangeDia(e.target.value ? Number(e.target.value) : null)}
          style={{ flex: 1 }}
        >
          <option value="">Día…</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
