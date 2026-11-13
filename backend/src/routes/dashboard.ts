import { Router } from 'express';
import type { Pool } from 'pg';
import { EXPIRING_SOON_DAYS, todayInLima } from '../services/expiration';
import { SUPPLY_COLS, withStatus } from '../services/supplyView';

export function dashboardRouter(pool: Pool): Router {
  const r = Router();

  r.get('/', async (_req, res) => {
    const today = todayInLima();
    const soon = EXPIRING_SOON_DAYS;

    const [totals, low, expiring, recent, patients] = await Promise.all([
      pool.query(
        `SELECT count(*)::int AS supplies,
                count(*) FILTER (WHERE stock <= min_stock)::int AS low_stock,
                count(*) FILTER (WHERE expiration_date < $1::date)::int AS expired,
                count(*) FILTER (WHERE expiration_date >= $1::date
                                   AND expiration_date <= $1::date + ${soon})::int AS expiring
           FROM supplies`,
        [today],
      ),
      pool.query(
        `SELECT ${SUPPLY_COLS} FROM supplies WHERE stock <= min_stock ORDER BY (stock - min_stock), name LIMIT 5`,
      ),
      pool.query(
        `SELECT ${SUPPLY_COLS} FROM supplies WHERE expiration_date <= $1::date + ${soon}
          ORDER BY expiration_date, name LIMIT 5`,
        [today],
      ),
      pool.query(
        `SELECT m.id, m.type, m.quantity, m.note, m.created_at, s.name AS supply_name, s.unit,
                p.full_name AS patient_name
           FROM movements m
           JOIN supplies s ON s.id = m.supply_id
           LEFT JOIN patients p ON p.id = m.patient_id
          ORDER BY m.created_at DESC, m.id DESC LIMIT 5`,
      ),
      pool.query('SELECT count(*)::int AS n FROM patients'),
    ]);

    res.json({
      totals: { ...totals.rows[0], patients: patients.rows[0].n },
      low_stock: low.rows.map(withStatus),
      expiring: expiring.rows.map(withStatus),
      recent_movements: recent.rows,
    });
  });

  return r;
}
