import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { HttpError } from '../errors';
import { applyMovement } from '../services/stock';
import { optionalParam } from '../validation';

const createSchema = z
  .object({
    supply_id: z.number().int().positive(),
    type: z.enum(['in', 'out']),
    quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
    note: z.string().trim().max(300).optional(),
    patient_id: z.number().int().positive().optional(),
  })
  .refine((d) => d.type === 'out' || d.patient_id === undefined, {
    message: 'Solo las salidas pueden asignarse a un paciente',
    path: ['patient_id'],
  });

const listQuery = z.object({
  supply_id: optionalParam(z.coerce.number().int().positive()),
  type: optionalParam(z.enum(['in', 'out'])),
  patient_id: optionalParam(z.coerce.number().int().positive()),
});

export function movementsRouter(pool: Pool): Router {
  const r = Router();

  r.get('/', async (req, res) => {
    const f = listQuery.parse(req.query);
    const { rows } = await pool.query(
      `SELECT m.*, s.name AS supply_name, s.unit, p.full_name AS patient_name
         FROM movements m
         JOIN supplies s ON s.id = m.supply_id
         LEFT JOIN patients p ON p.id = m.patient_id
        WHERE ($1::int IS NULL OR m.supply_id = $1)
          AND ($2::text IS NULL OR m.type = $2)
          AND ($3::int IS NULL OR m.patient_id = $3)
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 100`,
      [f.supply_id ?? null, f.type ?? null, f.patient_id ?? null],
    );
    res.json(rows);
  });

  r.post('/', async (req, res) => {
    const d = createSchema.parse(req.body);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // FOR UPDATE evita que dos salidas simultáneas dejen el stock negativo
      const found = await client.query('SELECT stock FROM supplies WHERE id=$1 FOR UPDATE', [d.supply_id]);
      if (!found.rows[0]) throw new HttpError(404, 'Insumo no encontrado');

      if (d.patient_id !== undefined) {
        const patient = await client.query('SELECT 1 FROM patients WHERE id=$1', [d.patient_id]);
        if (!patient.rowCount) throw new HttpError(404, 'Paciente no encontrado');
      }

      const newStock = applyMovement(found.rows[0].stock, d.type, d.quantity);
      await client.query('UPDATE supplies SET stock=$1 WHERE id=$2', [newStock, d.supply_id]);
      const ins = await client.query(
        'INSERT INTO movements (supply_id, type, quantity, note, patient_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [d.supply_id, d.type, d.quantity, d.note ?? null, d.patient_id ?? null],
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
