import { useState } from 'react';
import { apiUpload } from '../lib/apiClient.js';

// Campo de imagen para paneles de Admin: subida directa (drag/click) que guarda el archivo
// en el servidor y llena el campo de URL solo — sigue permitiendo pegar una ruta a mano.
export default function ImageUploadField({ id, label, value, onChange, previewHeight = 160, hint }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setSubiendo(true);
    try {
      const { url } = await apiUpload('/admin/uploads', file);
      onChange(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '0 0 6px' }}>{hint}</p>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="/images/… o sube una foto" style={{ flex: 1, minWidth: 180 }} />
        <label className="btn btn-secondary" style={{ margin: 0, cursor: 'pointer' }}>
          {subiendo ? 'Subiendo…' : 'Subir foto'}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onFile} disabled={subiendo} style={{ display: 'none' }} />
        </label>
      </div>
      {error && <p style={{ color: 'var(--critical)', fontSize: 12.5, margin: '4px 0 0' }}>{error}</p>}
      {value && (
        <img
          src={value}
          alt="Vista previa"
          style={{ width: '100%', maxHeight: previewHeight, objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginTop: 8 }}
        />
      )}
    </div>
  );
}
