import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import config from './config.js';
import { authRouter, requireAuth } from './auth.js';
import { catalogoRouter } from './routes/catalogo.js';
import { reservasRouter } from './routes/reservas.js';
import { clientesRouter } from './routes/clientes.js';
import { staffRouter } from './routes/staff.js';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use('/api', rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', db: Boolean(config.databaseUrl), ts: new Date().toISOString() });
});

// ---------- Público ----------
app.use('/api', catalogoRouter);
app.use('/api/reservas', reservasRouter);
app.use('/api/clientes', clientesRouter);

// ---------- Staff (login abierto, resto protegido) ----------
app.use('/api/staff', authRouter);
app.use('/api/staff', requireAuth, staffRouter);

// ---------- Cliente estático (build de Vite) ----------
const clientDist = resolve(config.clientDist);
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(resolve(clientDist, 'index.html')));
} else {
  console.warn(`[server] No se encontró el build del cliente en ${clientDist} (correr "npm run build:client" desde la raíz).`);
}

// Middleware de errores — SIEMPRE al final. Sin esto, cualquier error de un handler async
// (ej. la base de datos no responde) tira todo el proceso en vez de responder 500.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server] Error no capturado:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(config.port, () => {
  console.log(`[server] Oxygen Wellness Center API en puerto ${config.port} (${config.nodeEnv})`);
});
