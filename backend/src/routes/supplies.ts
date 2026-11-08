import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { HttpError } from '../errors';

const base = {
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  unit: z.string().trim().min(1, 'La unidad es obligatoria').max(20),
  min_stock: z.number().int().min(0).default(0),
};
const createSchema = z.object({ ...base, stock: z.number().int().min(0).default(0) });
const updateSchema = z.object(base);

export function suppliesRouter(pool: Pool): Router {
  const r = Router();

  r.get('/', async (_req, res) => {
    const { rows } = await pool.query('SELECT * FROM supplies ORDER BY name');
    res.json(rows);
  });

  r.post('/', async (req, res) => {
    const d = createSchema.parse(req.body);
    try {
      const { rows } = await pool.query(
        'INSERT INTO supplies (name, unit, stock, min_stock) VALUES ($1,$2,$3,$4) RETURNING *',
        [d.name, d.unit, d.stock, d.min_stock],
      );
      res.status(201).json(rows[0]);
    } catch (e: any) {
      if (e.code === '23505') throw new HttpError(409, 'Ya existe un insumo con ese nombre');
      throw e;
    }
  });

  // El stock NO se edita aquí: solo cambia mediante movimientos.
  r.put('/:id', async (req, res) => {
    const d = updateSchema.parse(req.body);
    const { rows } = await pool.query(
      'UPDATE supplies SET name=$1, unit=$2, min_stock=$3 WHERE id=$4 RETURNING *',
      [d.name, d.unit, d.min_stock, req.params.id],
    );
    if (!rows[0]) throw new HttpError(404, 'Insumo no encontrado');
    res.json(rows[0]);
  });

  r.delete('/:id', async (req, res) => {
    const { rowCount } = await pool.query('DELETE FROM supplies WHERE id=$1', [req.params.id]);
    if (!rowCount) throw new HttpError(404, 'Insumo no encontrado');
    res.status(204).end();
  });

  return r;
}
