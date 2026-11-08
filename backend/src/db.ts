import { Pool } from 'pg';

export function createPool(connectionString = process.env.DATABASE_URL): Pool {
  return new Pool({ connectionString });
}
