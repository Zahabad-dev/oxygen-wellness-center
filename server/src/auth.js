import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from './config.js';
import { query } from './db.js';
import { asyncHandler } from './asyncHandler.js';

const cookieOpts = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: config.cookieSecure ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export function requireAuth(req, res, next) {
  const token = req.cookies?.[config.cookieName];
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.staff = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.staff || !roles.includes(req.staff.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    next();
  };
}

export const authRouter = Router();

authRouter.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Falta email o password' });

  const { rows } = await query(
    `SELECT u.id, u.email, u.nombre, u.password_hash, u.activo, u.coach_id, r.nombre AS rol
     FROM usuarios_internos u
     JOIN roles r ON r.id = u.rol_id
     WHERE lower(u.email) = lower($1)`,
    [email]
  );
  const user = rows[0];
  if (!user || !user.activo) return res.status(401).json({ error: 'Credenciales inválidas' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  const payload = { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol, coachId: user.coach_id };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
  res.cookie(config.cookieName, token, cookieOpts);
  res.json({ user: payload });
}));

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.staff });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(config.cookieName, { ...cookieOpts, maxAge: undefined });
  res.json({ ok: true });
});
