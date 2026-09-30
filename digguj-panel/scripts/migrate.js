import { assertConfig } from '../server/config.js';
import { pool } from '../server/db.js';
import { migrate } from '../server/migrate.js';

try {
  assertConfig();
  await migrate();
  console.log('Baza danych jest aktualna.');
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
