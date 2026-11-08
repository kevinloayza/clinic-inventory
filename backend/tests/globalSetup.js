const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

module.exports = async () => {
  const url = new URL(process.env.TEST_DATABASE_URL || 'postgres://clinic:clinic@localhost:5432/clinic_test');
  const dbName = url.pathname.slice(1);
  if (!dbName.endsWith('_test')) {
    throw new Error(`Por seguridad la BD de pruebas debe terminar en "_test" (recibido: "${dbName}")`);
  }

  const admin = new Client({ connectionString: url.toString().replace(`/${dbName}`, '/postgres') });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!exists.rowCount) await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  const db = new Client({ connectionString: url.toString() });
  await db.connect();
  await db.query(fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8'));
  await db.end();
};
