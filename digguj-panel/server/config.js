import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Lokalnie zmienne czytamy z pliku .env (w Dockerze przekazuje je docker compose).
try { process.loadEnvFile(); } catch { /* brak pliku .env – OK */ }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;
const isProd = env.NODE_ENV === 'production';

function parseTrustProxy(value) {
  if (value === undefined || value === '') return isProd ? 1 : false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  const n = Number(value);
  return Number.isInteger(n) ? n : value;
}

export const config = {
  root,
  isProd,
  port: Number(env.PORT) || 3000,
  databaseUrl: env.DATABASE_URL,
  sessionSecret: env.SESSION_SECRET,
  // Ciasteczko sesji tylko po HTTPS – na produkcji zawsze, lokalnie (http://localhost) wyłączone.
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProd,
  trustProxy: parseTrustProxy(env.TRUST_PROXY),
  uploadDir: path.resolve(root, env.UPLOAD_DIR || 'uploads'),
  maxUploadMb: Number(env.MAX_UPLOAD_MB) || 25,
  sessionDays: Number(env.SESSION_DAYS) || 14,
};

export function assertConfig() {
  const problems = [];
  if (!config.databaseUrl) problems.push('Brak DATABASE_URL.');
  if (!config.sessionSecret || config.sessionSecret.length < 32) {
    problems.push('SESSION_SECRET musi mieć co najmniej 32 znaki (wygeneruj: openssl rand -hex 32).');
  }
  if (problems.length) throw new Error('Błędna konfiguracja:\n  - ' + problems.join('\n  - '));
}
