-- Oxigen Wellness Center — roles de Postgres (patrón Wolf Daniels / Sianna Travel)
-- Ejecutar después de 01_schema.sql. Cambia los password '__CAMBIA_*__' antes de correr en Easypanel.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'oxigen_app') THEN
    CREATE ROLE oxigen_app LOGIN PASSWORD '__CAMBIA_OXIGEN_APP__';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'oxigen_readonly') THEN
    CREATE ROLE oxigen_readonly LOGIN PASSWORD '__CAMBIA_OXIGEN_READONLY__';
  END IF;
END
$$;

-- oxigen_app: el usuario que usa el backend Express (DATABASE_URL). CRUD completo.
GRANT USAGE ON SCHEMA public TO oxigen_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO oxigen_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO oxigen_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO oxigen_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO oxigen_app;

-- oxigen_readonly: para cualquier consumidor externo de solo lectura (reportes, futuras integraciones).
GRANT USAGE ON SCHEMA public TO oxigen_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO oxigen_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO oxigen_readonly;
