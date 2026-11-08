import { Pool } from 'pg';

export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://clinic:clinic@localhost:5432/clinic_test';

export function createTestPool(): Pool {
  const name = new URL(TEST_DB_URL).pathname.slice(1);
  if (!name.endsWith('_test')) throw new Error('Las pruebas solo pueden correr contra una BD "_test"');
  return new Pool({ connectionString: TEST_DB_URL });
}

export async function resetDb(pool: Pool): Promise<void> {
  await pool.query('TRUNCATE movements, supplies, patients RESTART IDENTITY CASCADE');
}
