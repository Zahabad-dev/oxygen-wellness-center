const BASE = import.meta.env.VITE_API_URL || '/api';

async function req(endpoint, options = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    const err = new Error((data && data.error) || `Error ${res.status}`);
    err.advertencia = data?.advertencia;
    throw err;
  }
  return data;
}

export const apiGet = (endpoint) => req(endpoint);
export const apiPost = (endpoint, body) => req(endpoint, { method: 'POST', body: JSON.stringify(body) });
export const apiPut = (endpoint, body) => req(endpoint, { method: 'PUT', body: JSON.stringify(body) });
export const apiDelete = (endpoint) => req(endpoint, { method: 'DELETE' });
