import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config.js';
import { pool } from './db.js';

const MIGRATIONS_DIR = path.join(config.root, 'migrations');
const LOCK_ID = 727001;

/**
 * Wykonuje po kolei wszystkie pliki migrations/NNN_nazwa.sql, których jeszcze nie ma
 * w tabeli schema_migrations. Każdy plik to osobna transakcja.
 * Zmiany w bazie ZAWSZE dodajemy nowym plikiem – nigdy nie edytujemy już wykonanych.
 */
export async function migrate({ log = console.log } = {}) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const done = new Set(rows.map((r) => r.name));
    const files = (await fs.readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        log(`[migracje] wykonano ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migracja ${file} nie powiodła się: ${err.message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    client.release();
  }
}
