import pg from 'pg';
import config from './config.js';

const { Pool, types } = pg;

// Oxigen sí usa columnas DATE reales (fecha de clase, vigencias de membresías/paquetes).
// Por defecto `pg` las convierte a un objeto Date de JS en la zona horaria del proceso, lo que
// puede correr la fecha un día al renderizarla — se deja como string 'YYYY-MM-DD' tal cual la
// entrega Postgres. OID 1082 = DATE.
types.setTypeParser(1082, (val) => val);

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[db] Error inesperado en el pool de Postgres:', err.message);
});

// El servidor de Postgres corre en UTC. Sin esto, CURRENT_DATE/NOW() se adelantan un dia
// entre las 18:00 y las 23:59 hora Ciudad de Mexico, ocultando clases de "hoy" en el
// catalogo publico (que filtra por fecha >= CURRENT_DATE) aunque el staff si las viera.
pool.on('connect', (client) => {
  client.query("SET TIME ZONE 'America/Mexico_City'").catch((err) => {
    console.error('[db] No se pudo fijar TIME ZONE en la conexion:', err.message);
  });
});

export function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
