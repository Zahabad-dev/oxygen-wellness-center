import { randomInt } from 'node:crypto';

// Sin 0/O/1/l/I para que se pueda dictar o leer en un mensaje sin confundir caracteres.
const ALFABETO = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generarPassword(largo = 10) {
  let out = '';
  for (let i = 0; i < largo; i += 1) out += ALFABETO[randomInt(ALFABETO.length)];
  return out;
}

// "Gerald Pilates" -> "gerald.pilates" (sin acentos ni símbolos).
export function usuarioDesdeNombre(nombre) {
  const base = String(nombre || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return base || 'coach';
}
