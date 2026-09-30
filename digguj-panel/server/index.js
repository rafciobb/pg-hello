import fs from 'node:fs/promises';
import { assertConfig, config } from './config.js';
import { migrate } from './migrate.js';
import { createApp } from './app.js';
import { pool, query } from './db.js';
import { hashPassword, validateNewPassword } from './auth.js';

/**
 * Tylko do testów lokalnych: jeśli w bazie nie ma jeszcze żadnego konta, a ustawiono
 * BOOTSTRAP_ADMIN_USER i BOOTSTRAP_ADMIN_PASSWORD, zakłada pierwsze konto automatycznie.
 */
async function bootstrapAdmin() {
  const { BOOTSTRAP_ADMIN_USER: username, BOOTSTRAP_ADMIN_PASSWORD: password } = process.env;
  if (!username || !password) return;
  const { rows } = await query('SELECT count(*)::int AS n FROM users');
  if (rows[0].n > 0) return;
  const problem = validateNewPassword(password);
  if (problem) throw new Error(`BOOTSTRAP_ADMIN_PASSWORD: ${problem}`);
  await query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, await hashPassword(password)]);
  console.log(`Utworzono pierwsze konto: ${username}`);
}

async function main() {
  assertConfig();
  await fs.mkdir(config.uploadDir, { recursive: true });
  await migrate();
  await bootstrapAdmin();

  const server = createApp().listen(config.port, () => {
    console.log(`DIGGUJ panel działa na http://localhost:${config.port}`);
  });

  const shutdown = (signal) => {
    console.log(`Otrzymano ${signal}, zamykanie…`);
    server.close(() => pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
