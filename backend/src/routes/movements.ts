import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { HttpError } from '../errors';
import { applyMovement } from '../services/stock';

const schema = z.object({
  supply_id: z.number().int().positive(),
  type: z.enum(['in', 'out']),
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
  note: z.string().trim().max(300).optional(),
});

export function movementsRouter(pool: Pool): Router {
  const r = Router();

  r.get('/', async (req, res) => {
    const supplyId = req.query.supply_id ? Number(req.query.supply_id) : null;
    const { rows } = await pool.query(
      `SELECT m.*, s.name AS supply_name, s.unit
         FROM movements m JOIN supplies s ON s.id = m.supply_id
        WHERE ($1::int IS NULL OR m.supply_id = $1)
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 100`,
      [supplyId],
    );
    res.json(rows);
  });

  r.post('/', async (req, res) => {
    const d = schema.parse(req.body);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // FOR UPDATE evita que dos salidas simultáneas dejen el stock negativo
      const found = await client.query('SELECT stock FROM supplies WHERE id=$1 FOR UPDATE', [d.supply_id]);
      if (!found.rows[0]) throw new HttpError(404, 'Insumo no encontrado');

      const newStock = applyMovement(found.rows[0].stock, d.type, d.quantity);
      await client.query('UPDATE supplies SET stock=$1 WHERE id=$2', [newStock, d.supply_id]);
      const ins = await client.query(
        'INSERT INTO movements (supply_id, type, quantity, note) VALUES ($1,$2,$3,$4) RETURNING *',
        [d.supply_id, d.type, d.quantity, d.note ?? null],
      );
      await client.query('COMMIT');
      res.status(201).json({ movement: ins.rows[0], stock: newStock });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  });

  return r;
}
