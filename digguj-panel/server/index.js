import fs from 'node:fs/promises';
import { assertConfig, config } from './config.js';
import { pool } from './db.js';
import { migrate } from './migrate.js';
import { createApp } from './app.js';

async function main() {
  assertConfig();
  await fs.mkdir(config.uploadDir, { recursive: true });
  await migrate();

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
