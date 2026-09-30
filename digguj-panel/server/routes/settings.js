import { Router } from 'express';
import { query } from '../db.js';

const CTA_KEYS = ['ctaEnabled', 'ctaStyle', 'ctaLabel', 'ctaTitle', 'ctaText', 'ctaHandle'];

/** Dozwolone klucze ustawień i ich walidacja (zwraca oczyszczoną wartość albo rzuca błąd 400). */
const VALIDATORS = {
  ctaDefaults(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw badRequest('Nieprawidłowe ustawienia CTA.');
    const out = {};
    for (const key of CTA_KEYS) {
      if (value[key] === undefined) continue;
      if (typeof value[key] !== 'string' || value[key].length > 500) throw badRequest(`Nieprawidłowa wartość pola ${key}.`);
      out[key] = value[key];
    }
    return out;
  },
};

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function validator(req) {
  const fn = Object.hasOwn(VALIDATORS, req.params.key) ? VALIDATORS[req.params.key] : null;
  if (!fn) throw Object.assign(new Error('Nieznane ustawienie.'), { status: 404 });
  return fn;
}

export const settingsRouter = Router();

settingsRouter.get('/:key', async (req, res) => {
  validator(req);
  const { rows } = await query('SELECT value FROM settings WHERE key = $1', [req.params.key]);
  res.json({ value: rows[0]?.value ?? null });
});

settingsRouter.put('/:key', async (req, res) => {
  const value = validator(req)(req.body?.value);
  await query(
    `INSERT INTO settings (key, value, updated_by) VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [req.params.key, JSON.stringify(value), req.user.id],
  );
  res.json({ value });
});
