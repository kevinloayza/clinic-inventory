import 'express-async-errors';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { ZodError } from 'zod';
import { HttpError } from './errors';
import { InsufficientStockError } from './services/stock';
import { dashboardRouter } from './routes/dashboard';
import { movementsRouter } from './routes/movements';
import { patientsRouter } from './routes/patients';
import { suppliesRouter } from './routes/supplies';

/** Fábrica de la app: recibe el pool para poder inyectar una BD de pruebas con Jest. */
export function createApp(pool: Pool) {
  const app = express();
  const origins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
  app.use(cors({ origin: origins?.length ? origins : '*' }));
  app.use(express.json());

  // commit: lo informa Render; permite al pipeline comprobar qué versión quedó en línea
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', commit: process.env.RENDER_GIT_COMMIT ?? null }));
  app.use('/api/dashboard', dashboardRouter(pool));
  app.use('/api/supplies', suppliesRouter(pool));
  app.use('/api/movements', movementsRouter(pool));
  app.use('/api/patients', patientsRouter(pool));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.issues[0]?.message ?? 'Datos inválidos' });
    }
    if (err instanceof InsufficientStockError) return res.status(409).json({ error: err.message });
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
