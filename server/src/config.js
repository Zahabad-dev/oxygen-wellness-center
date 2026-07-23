const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',

  // Postgres (Easypanel). En Easypanel usar el host INTERNO del servicio:
  // postgres://oxygen_app:PASS@<servicio-pg>:5432/oxygen
  databaseUrl: process.env.DATABASE_URL || '',

  jwtSecret: process.env.JWT_SECRET || 'cambia-este-secreto-en-produccion',
  cookieName: 'oxygen_staff',
  cookieSecure: process.env.COOKIE_SECURE !== '0',

  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  uploadDir: process.env.UPLOAD_DIR || './uploads',
  clientDist: process.env.CLIENT_DIST || '../client/dist',
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:5173',
};

export default config;
