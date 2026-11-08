// Aplica db/schema.sql (idempotente) a la base indicada en DATABASE_URL.
// Con --seed carga además datos de ejemplo (db/seed.sql). Uso:
//   DATABASE_URL=... npm run db:init
//   DATABASE_URL=... npm run db:init -- --seed
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta la variable DATABASE_URL');

  const client = new Client({ connectionString: url });
  await client.connect();
  const dbDir = path.join(__dirname, '../../db');

  await client.query(fs.readFileSync(path.join(dbDir, 'schema.sql'), 'utf8'));
  console.log('Esquema aplicado');

  if (process.argv.includes('--seed')) {
    await client.query(fs.readFileSync(path.join(dbDir, 'seed.sql'), 'utf8'));
    console.log('Datos de ejemplo cargados');
  }
  await client.end();
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
