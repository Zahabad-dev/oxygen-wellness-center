# Oxygen Wellness Center

Plataforma de reservas, identidad por QR y operación de estudio para Oxygen Wellness Center.
Mismo patrón técnico que Sianna Travel: **React + Vite** (cliente) + **Node/Express + PostgreSQL** (server),
pensado para correr en **Easypanel** (sin Vercel).

Ver el documento de diseño de producto completo (arquitectura, roles, flujos, modelo de datos) en el
artefacto compartido en la conversación con Claude. Este README cubre solo la puesta en marcha técnica.

## Estado de este corte (Fase 0, primera versión)

Construido y funcionando end-to-end (una vez conectado a una base de datos real):
- Catálogo público de clases con filtros (disciplina, fecha) y cupo disponible.
- Reserva sin login (nombre + WhatsApp + email opcional) → crea el perfil del cliente y su **QR permanente**
  si es la primera vez, o reutiliza el existente. Si no hay cupo, entra a lista de espera con posición.
- Pantalla de QR con botones **Compartir** (usa el WhatsApp propio del cliente vía `navigator.share`) y
  **Descargar** — nada de envío automático por WhatsApp todavía (eso es Fase 1, ver el documento de diseño).
- Enlace permanente `/mi-qr/:token` para volver a ver el QR si se perdió la pantalla.
- Login de staff (JWT en cookie httpOnly) con roles `administrador`, `recepcion`, `coach`.
- Agenda de hoy con roster por clase (recepción ve todo, coach solo lo suyo).
- Check-in por escáner de cámara (`html5-qrcode`, con respaldo de código manual), con validación de ventana
  horaria configurable y creación de reserva "sobre la marcha" si hay cupo y el cliente no tenía una.

**Qué falta (siguiente iteración, ya soportado por el esquema de datos, sin necesitar rediseño):**
CRUD completo de Admin vía interfaz (disciplinas/coaches/salones/clases/membresías/paquetes/usuarios/config —
hoy solo vía SQL), motor de evaluación de promociones + su UI, dashboard de KPIs, pagos en línea,
notificaciones automáticas por WhatsApp, estadísticas del coach.

## Estructura

```
OXIGEN WELLNESS CENTER/
├── sql/           01_schema.sql · 02_usuarios.sql · 03_seed.sql
├── server/        Express + pg (API)
└── client/        React + Vite (público + /staff/*)
```

## Puesta en marcha

### 1. Base de datos (Postgres en Easypanel)

Provisiona un servicio de Postgres en Easypanel (igual que hiciste para Sianna: un servicio propio,
sin puerto público expuesto a internet). Con un cliente SQL (DBGate, psql, etc.) conectado a esa base,
corre en este orden:

```sql
-- 1. Esquema
\i sql/01_schema.sql
-- 2. Roles de Postgres — antes de correr, edita los password __CAMBIA_*__ dentro del archivo
\i sql/02_usuarios.sql
-- 3. Datos semilla (disciplinas, sucursal/salón demo, coach demo, clase demo, config, usuario admin)
\i sql/03_seed.sql
```

El usuario admin de la semilla es `admin@oxygenwc.com` / `OxygenAdmin2026` — **cámbialo** generando un
hash nuevo:

```bash
cd server
npm run hash -- "TuPasswordNueva"
# pega el hash resultante en usuarios_internos.password_hash con un UPDATE
```

### 2. Variables de entorno

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

En `server/.env`, como mínimo:
- `DATABASE_URL=postgres://oxygen_app:PASSWORD@<host-interno-easypanel>:5432/oxygen`
- `JWT_SECRET=` — genera uno largo y aleatorio.
- En producción: `NODE_ENV=production`, `COOKIE_SECURE=1`.

### 3. Instalar y correr en desarrollo

Desde la raíz del proyecto:

```bash
npm run install:all
npm run dev
```

Esto levanta el server (`:3001`) y el cliente (`:5173`, con proxy `/api` → el server) en paralelo.
Abre `http://localhost:5173`.

### 4. Build y despliegue (Easypanel)

```bash
npm run build   # build:server (no-op) + build:client (Vite → client/dist)
npm start        # arranca server/src/index.js, que sirve la API y el client/dist ya compilado
```

En Easypanel: un solo servicio Node apuntando a esta carpeta, comando de build `npm run install:all && npm run build`,
comando de arranque `npm start`, puerto expuesto = el de `PORT` (por defecto 3001). El Postgres va en un
servicio aparte del mismo proyecto, sin puerto público.

## Notas técnicas

- **Fix de columnas `DATE`**: a diferencia de Sianna (que evita `DATE` por completo), aquí sí hay fechas
  reales (clase, vigencias). `server/src/db.js` fija el parser de `pg` para el OID 1082 (`DATE`) y lo deja
  como string `YYYY-MM-DD` tal cual, evitando el corrimiento de un día que da el `Date` de JS por defecto.
- **Todo handler async que toca la base de datos está envuelto en `asyncHandler`** (`server/src/asyncHandler.js`).
  Sin esto, cualquier error de conexión a la base tumba el proceso completo de Node en vez de responder un
  500 — se verificó explícitamente provocando una caída de conexión durante el desarrollo de este corte.
- El QR codifica solo el `qr_token` (UUID) del cliente — es permanente, no se regenera entre reservas.
  Las rutas públicas `/api/clientes/:qrToken/...` son intencionalmente públicas: el token en sí es la
  credencial (como un enlace secreto de calendario), así que no hay endpoints públicos por id numérico
  adivinable que expongan datos de otros clientes.
