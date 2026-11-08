import { Pool } from 'pg';

export function createPool(connectionString = process.env.DATABASE_URL): Pool {
  // Cierra conexiones inactivas antes de que Neon suspenda el cómputo
  const pool = new Pool({ connectionString, idleTimeoutMillis: 10_000 });
  // Sin este manejador, una conexión inactiva cortada por el servidor tumbaría todo el proceso
  pool.on('error', (err) => console.error('Conexión inactiva de Postgres cerrada:', err.message));
  return pool;
}
