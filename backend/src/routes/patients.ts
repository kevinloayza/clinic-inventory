import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { HttpError } from '../errors';

const schema = z.object({
  full_name: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
  dni: z.string().trim().regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos'),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (AAAA-MM-DD)'),
});

export function patientsRouter(pool: Pool): Router {
  const r = Router();

  // Búsqueda por nombre (parcial, sin distinguir mayúsculas) o por DNI
  r.get('/', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    const { rows } = await pool.query(
      `SELECT id, full_name, dni, to_char(birth_date, 'YYYY-MM-DD') AS birth_date
         FROM patients
        WHERE $1 = '' OR fullname ILIKE '%' || $1 || '%' OR dni LIKE $1 || '%'
        ORDER BY full_name
        LIMIT 50`,
      [q],
    );
    res.json(rows);
  });

  r.post('/', async (req, res) => {
    const d = schema.parse(req.body);
    try {
      const { rows } = await pool.query(
        `INSERT INTO patients (full_name, dni, birth_date) VALUES ($1,$2,$3)
         RETURNING id, full_name, dni, to_char(birth_date, 'YYYY-MM-DD') AS birth_date`,
        [d.full_name, d.dni, d.birth_date],
      );
      res.status(201).json(rows[0]);
    } catch (e: any) {
      if (e.code === '23505') throw new HttpError(409, 'Ya existe un paciente con ese DNI');
      throw e;
    }
  });

  return r;
}
