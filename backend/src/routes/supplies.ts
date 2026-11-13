import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { HttpError } from '../errors';
import { EXPIRING_SOON_DAYS, todayInLima } from '../services/expiration';
import { SUPPLY_COLS as COLS, withStatus } from '../services/supplyView';
import { optionalParam } from '../validation';

const isRealDate = (s: string): boolean => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const expiration = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de vencimiento inválida (AAAA-MM-DD)')
  .refine(isRealDate, 'La fecha de vencimiento no existe')
  .nullable()
  .optional();

const base = {
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  unit: z.string().trim().min(1, 'La unidad es obligatoria').max(20),
  min_stock: z.number().int().min(0).default(0),
  expiration_date: expiration,
};
const createSchema = z.object({ ...base, stock: z.number().int().min(0).default(0) });
const updateSchema = z.object(base);

const listQuery = z.object({
  q: optionalParam(z.string().trim().max(120)),
  status: optionalParam(z.enum(['low', 'expiring', 'expired'])),
});

export function suppliesRouter(pool: Pool): Router {
  const r = Router();

  // ?q= busca por nombre; ?status= filtra por stock bajo, por vencer o vencidos
  r.get('/', async (req, res) => {
    const { q, status } = listQuery.parse(req.query);
    const { rows } = await pool.query(
      `SELECT ${COLS} FROM supplies
        WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
          AND ($2::text IS NULL
               OR ($2 = 'low' AND stock <= min_stock)
               OR ($2 = 'expired' AND expiration_date < $3::date)
               OR ($2 = 'expiring' AND expiration_date >= $3::date
                                   AND expiration_date <= $3::date + ${EXPIRING_SOON_DAYS}))
        ORDER BY name`,
      [q || null, status ?? null, todayInLima()],
    );
    res.json(rows.map(withStatus));
  });

  r.post('/', async (req, res) => {
    const d = createSchema.parse(req.body);
    try {
      const { rows } = await pool.query(
        `INSERT INTO supplies (name, unit, stock, min_stock, expiration_date)
         VALUES ($1,$2,$3,$4,$5) RETURNING ${COLS}`,
        [d.name, d.unit, d.stock, d.min_stock, d.expiration_date ?? null],
      );
      res.status(201).json(withStatus(rows[0]));
    } catch (e: any) {
      if (e.code === '23505') throw new HttpError(409, 'Ya existe un insumo con ese nombre');
      throw e;
    }
  });

  // El stock NO se edita aquí: solo cambia mediante movimientos.
  // PUT reemplaza los datos del insumo: si no se envía expiration_date, se borra.
  r.put('/:id', async (req, res) => {
    const d = updateSchema.parse(req.body);
    const { rows } = await pool.query(
      `UPDATE supplies SET name=$1, unit=$2, min_stock=$3, expiration_date=$4
        WHERE id=$5 RETURNING ${COLS}`,
      [d.name, d.unit, d.min_stock, d.expiration_date ?? null, req.params.id],
    );
    if (!rows[0]) throw new HttpError(404, 'Insumo no encontrado');
    res.json(withStatus(rows[0]));
  });

  r.delete('/:id', async (req, res) => {
    const { rowCount } = await pool.query('DELETE FROM supplies WHERE id=$1', [req.params.id]);
    if (!rowCount) throw new HttpError(404, 'Insumo no encontrado');
    res.status(204).end();
  });

  return r;
}
