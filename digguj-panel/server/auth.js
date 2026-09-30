import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from './db.js';

const scrypt = promisify(crypto.scrypt);
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 64;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEY_LEN, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  const [algo, N, r, p, saltB64, keyB64] = String(stored).split('$');
  if (algo !== 'scrypt') return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem,
  });
  return crypto.timingSafeEqual(key, expected);
}

export function validateNewPassword(password) {
  if (typeof password !== 'string' || password.length < 10) return 'Hasło musi mieć co najmniej 10 znaków.';
  if (password.length > 200) return 'Hasło jest za długie.';
  return null;
}

// Hash "wydmuszka" – gdy login nie istnieje i tak liczymy scrypt, żeby czas odpowiedzi
// nie zdradzał, czy dany użytkownik jest w bazie.
const dummyHashPromise = hashPassword(crypto.randomBytes(16).toString('hex'));

/** Dołącza req.user, jeśli sesja jest aktywna, a użytkownik wciąż istnieje. */
export async function loadUser(req, _res, next) {
  const userId = req.session?.userId;
  if (userId) {
    const { rows } = await query('SELECT id, username, role FROM users WHERE id = $1', [userId]);
    req.user = rows[0] ?? null;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Nie jesteś zalogowany.' });
  next();
}

export function requirePage(req, res, next) {
  if (!req.user) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  next();
}

/**
 * Ochrona przed CSRF: każde zapytanie zmieniające dane musi mieć nagłówek X-Requested-With
 * (formularz z obcej strony nie może go ustawić) i – jeśli przeglądarka go wysyła – zgodny Origin.
 */
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'digguj') {
    return res.status(403).json({ error: 'Odrzucono żądanie (CSRF).' });
  }
  const origin = req.get('Origin');
  if (origin) {
    let originHost = null;
    try { originHost = new URL(origin).host; } catch { /* zły nagłówek */ }
    if (originHost !== req.get('Host')) return res.status(403).json({ error: 'Odrzucono żądanie (Origin).' });
  }
  next();
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Za dużo nieudanych prób logowania. Spróbuj ponownie za kilkanaście minut.' },
});

const regenerate = (session) => new Promise((resolve, reject) => session.regenerate((e) => (e ? reject(e) : resolve())));
const destroy = (session) => new Promise((resolve, reject) => session.destroy((e) => (e ? reject(e) : resolve())));

export const authRouter = Router();

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password
      || username.length > 100 || password.length > 200) {
    return res.status(400).json({ error: 'Podaj login i hasło.' });
  }
  const { rows } = await query(
    'SELECT id, username, role, password_hash FROM users WHERE lower(username) = lower($1)',
    [username.trim()],
  );
  const user = rows[0];
  const ok = await verifyPassword(password, user ? user.password_hash : await dummyHashPromise);
  if (!user || !ok) return res.status(401).json({ error: 'Nieprawidłowy login lub hasło.' });

  await regenerate(req.session); // nowe ID sesji po zalogowaniu (ochrona przed session fixation)
  req.session.userId = user.id;
  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
  res.json({ user: { id: user.id, username: user.username, role: user.role } });
});

authRouter.post('/logout', async (req, res) => {
  if (req.session) await destroy(req.session);
  res.clearCookie('digguj.sid');
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.post('/password', requireAuth, loginLimiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const problem = validateNewPassword(newPassword);
  if (problem) return res.status(400).json({ error: problem });
  if (typeof currentPassword !== 'string') return res.status(400).json({ error: 'Podaj obecne hasło.' });

  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0] || !(await verifyPassword(currentPassword, rows[0].password_hash))) {
    return res.status(401).json({ error: 'Obecne hasło jest nieprawidłowe.' });
  }
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [await hashPassword(newPassword), req.user.id]);
  // Wylogowujemy pozostałe sesje tego użytkownika
  await query(`DELETE FROM session WHERE sid <> $1 AND (sess->>'userId')::int = $2`, [req.sessionID, req.user.id]);
  res.json({ ok: true });
});
