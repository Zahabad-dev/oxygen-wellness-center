import { Router } from 'express';
import { query } from './db.js';
import { asyncHandler } from './asyncHandler.js';

export function pickAllowed(body, allowed) {
  const out = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body || {}, key)) out[key] = body[key];
  }
  return out;
}

export function buildInsert(table, data, jsonCols = []) {
  const keys = Object.keys(data);
  const values = keys.map((k) => (jsonCols.includes(k) ? JSON.stringify(data[k]) : data[k]));
  const placeholders = keys.map((k, i) => (jsonCols.includes(k) ? `$${i + 1}::jsonb` : `$${i + 1}`));
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
  return { sql, values };
}

export function buildUpdate(table, idField, idVal, data, jsonCols = []) {
  const keys = Object.keys(data);
  const sets = keys.map((k, i) => (jsonCols.includes(k) ? `${k} = $${i + 1}::jsonb` : `${k} = $${i + 1}`));
  const values = keys.map((k) => (jsonCols.includes(k) ? JSON.stringify(data[k]) : data[k]));
  values.push(idVal);
  const sql = `UPDATE ${table} SET ${sets.join(', ')} WHERE ${idField} = $${values.length} RETURNING *`;
  return { sql, values };
}

// Router CRUD genérico con whitelist de columnas — para catálogos simples (disciplinas, salones, etc.)
export function crudRouter({ table, allowed, jsonCols = [], idField = 'id', orderBy = 'id' }) {
  const router = Router();

  router.get('/', asyncHandler(async (_req, res) => {
    const { rows } = await query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
    res.json(rows);
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT * FROM ${table} WHERE ${idField} = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const data = pickAllowed(req.body, allowed);
    const { sql, values } = buildInsert(table, data, jsonCols);
    const { rows } = await query(sql, values);
    res.status(201).json(rows[0]);
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    const data = pickAllowed(req.body, allowed);
    const { sql, values } = buildUpdate(table, idField, req.params.id, data, jsonCols);
    const { rows } = await query(sql, values);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    await query(`DELETE FROM ${table} WHERE ${idField} = $1`, [req.params.id]);
    res.json({ ok: true });
  }));

  return router;
}
