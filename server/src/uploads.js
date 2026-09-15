import { existsSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve, extname } from 'node:path';
import multer from 'multer';
import config from './config.js';

// Fotos que sube el admin desde el panel (hero, coaches, disciplinas) — se guardan en un
// volumen persistente del servidor (montado en Easypanel), no en el repo de git: así se
// ven al instante, sin rebuild, y sin necesitar credenciales de GitHub en producción.
export const uploadsDir = resolve(config.uploadDir);
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${MIME_EXT[file.mimetype] || extname(file.originalname).toLowerCase()}`),
});

export const uploadImage = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!MIME_EXT[file.mimetype]) {
      return cb(new Error('Solo se aceptan imágenes JPG, PNG, WEBP o GIF.'));
    }
    cb(null, true);
  },
});
