import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { HttpError } from '../errors';
import { idParam } from '../validation';

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
        WHERE $1 = '' OR full_name ILIKE '%' || $1 || '%' OR dni LIKE $1 || '%'
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

  r.put('/:id', async (req, res) => {
    const id = idParam.parse(req.params.id);
    const d = schema.parse(req.body);
    try {
      const { rows } = await pool.query(
        `UPDATE patients SET full_name=$1, dni=$2, birth_date=$3 WHERE id=$4
         RETURNING id, full_name, dni, to_char(birth_date, 'YYYY-MM-DD') AS birth_date`,
        [d.full_name, d.dni, d.birth_date, id],
      );
      if (!rows[0]) throw new HttpError(404, 'Paciente no encontrado');
      res.json(rows[0]);
    } catch (e: any) {
      if (e.code === '23505') throw new HttpError(409, 'Ya existe un paciente con ese DNI');
      throw e;
    }
  });

  // Los movimientos ya registrados se conservan, solo pierden la referencia al paciente
  r.delete('/:id', async (req, res) => {
    const id = idParam.parse(req.params.id);
    const { rowCount } = await pool.query('DELETE FROM patients WHERE id=$1', [id]);
    if (!rowCount) throw new HttpError(404, 'Paciente no encontrado');
    res.status(204).end();
  });

  return r;
}
