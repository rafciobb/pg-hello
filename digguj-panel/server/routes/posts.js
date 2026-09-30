import { Router } from 'express';
import { query } from '../db.js';
import { copyMedia, deleteMedia, mediaUrl, storeImageBuffer } from './media.js';

export const MODES = ['album', 'general', 'calendar'];
export const FORMATS = ['carousel', 'reel', 'video'];
export const STATUSES = ['draft', 'ready', 'scheduled', 'published'];

const SORTS = {
  updated: 'p.updated_at DESC',
  created: 'p.created_at DESC',
  scheduled: 'p.scheduled_at ASC NULLS LAST, p.updated_at DESC',
};

const MAX_THUMB_BYTES = 1024 * 1024;

class ValidationError extends Error {
  status = 400;
}

function serialize(row, { full = false } = {}) {
  const post = {
    id: row.id,
    title: row.title,
    mode: row.mode,
    format: row.format,
    status: row.status,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
    caption: row.caption,
    thumbUrl: mediaUrl(row.thumb_media_id),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by_name ?? null,
    updatedBy: row.updated_by_name ?? null,
  };
  if (full) post.data = row.data;
  return post;
}

const SELECT_POST = `
  SELECT p.*, cu.username AS created_by_name, uu.username AS updated_by_name
  FROM posts p
  LEFT JOIN users cu ON cu.id = p.created_by
  LEFT JOIN users uu ON uu.id = p.updated_by`;

/** Waliduje dane z edytora. Zwraca tylko pola, które przyszły w żądaniu. */
function parsePostInput(body) {
  if (!body || typeof body !== 'object') throw new ValidationError('Brak danych posta.');
  const out = {};

  if ('title' in body) {
    if (typeof body.title !== 'string' || body.title.length > 200) throw new ValidationError('Tytuł: maks. 200 znaków.');
    out.title = body.title.trim();
  }
  for (const [key, allowed] of [['mode', MODES], ['format', FORMATS], ['status', STATUSES]]) {
    if (key in body) {
      if (!allowed.includes(body[key])) throw new ValidationError(`Nieprawidłowa wartość pola ${key}.`);
      out[key] = body[key];
    }
  }
  if ('scheduledAt' in body) {
    if (body.scheduledAt === null || body.scheduledAt === '') out.scheduledAt = null;
    else {
      const d = new Date(body.scheduledAt);
      if (Number.isNaN(d.getTime())) throw new ValidationError('Nieprawidłowa data publikacji.');
      out.scheduledAt = d;
    }
  }
  if ('caption' in body) {
    if (typeof body.caption !== 'string' || body.caption.length > 10_000) throw new ValidationError('Opis: maks. 10 000 znaków.');
    out.caption = body.caption;
  }
  if ('data' in body) {
    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) throw new ValidationError('Nieprawidłowe dane edytora.');
    out.data = body.data;
  }
  if ('thumbnail' in body && body.thumbnail !== null) {
    const m = typeof body.thumbnail === 'string' && body.thumbnail.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new ValidationError('Nieprawidłowa miniatura.');
    const buf = Buffer.from(m[1], 'base64');
    if (buf.length > MAX_THUMB_BYTES) throw new ValidationError('Miniatura jest za duża.');
    out.thumbnail = buf;
  }
  return out;
}

const COLUMN = {
  title: 'title', mode: 'mode', format: 'format', status: 'status', scheduledAt: 'scheduled_at',
  caption: 'caption', data: 'data',
};

function parseId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw Object.assign(new Error('Nie znaleziono posta.'), { status: 404 });
  return id;
}

async function replaceThumbnail(postId, buffer, userId) {
  const newId = await storeImageBuffer(buffer, { kind: 'thumbnail', userId });
  const { rows } = await query(
    `UPDATE posts p SET thumb_media_id = $1 FROM (SELECT thumb_media_id AS old FROM posts WHERE id = $2) o
     WHERE p.id = $2 RETURNING o.old`,
    [newId, postId],
  );
  await deleteMedia(rows[0]?.old);
  return newId;
}

export const postsRouter = Router();

postsRouter.get('/', async (req, res) => {
  const where = [];
  const params = [];
  const add = (sql, value) => { params.push(value); where.push(sql.replaceAll('?', `$${params.length}`)); };

  if (STATUSES.includes(req.query.status)) add('p.status = ?', req.query.status);
  if (MODES.includes(req.query.mode)) add('p.mode = ?', req.query.mode);
  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const like = '%' + req.query.q.trim().replace(/[\\%_]/g, (c) => '\\' + c) + '%';
    add('(p.title ILIKE ? OR p.caption ILIKE ?)', like);
  }
  const order = SORTS[req.query.sort] ?? SORTS.updated;
  const { rows } = await query(
    `${SELECT_POST} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order} LIMIT 500`,
    params,
  );
  res.json({ posts: rows.map((r) => serialize(r)) });
});

postsRouter.get('/:id', async (req, res) => {
  const { rows } = await query(`${SELECT_POST} WHERE p.id = $1`, [parseId(req)]);
  if (!rows[0]) return res.status(404).json({ error: 'Nie znaleziono posta.' });
  res.json({ post: serialize(rows[0], { full: true }) });
});

postsRouter.post('/', async (req, res) => {
  const input = parsePostInput({ mode: 'album', format: 'carousel', data: {}, ...req.body });
  if (input.mode === 'calendar' && !('format' in (req.body ?? {}))) input.format = 'reel';
  const { rows } = await query(
    `INSERT INTO posts (title, mode, format, status, scheduled_at, caption, data, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $8) RETURNING id`,
    [input.title ?? '', input.mode, input.format, input.status ?? 'draft', input.scheduledAt ?? null,
      input.caption ?? '', JSON.stringify(input.data), req.user.id],
  );
  const id = rows[0].id;
  if (input.thumbnail) await replaceThumbnail(id, input.thumbnail, req.user.id);
  const created = await query(`${SELECT_POST} WHERE p.id = $1`, [id]);
  res.status(201).json({ post: serialize(created.rows[0], { full: true }) });
});

/**
 * Aktualizacja (pełna z edytora lub częściowa, np. sama zmiana statusu z listy).
 * Wymaga `version` – jeśli ktoś w międzyczasie zapisał post (inna karta/urządzenie), zwracamy 409.
 */
postsRouter.put('/:id', async (req, res) => {
  const id = parseId(req);
  const version = Number(req.body?.version);
  if (!Number.isInteger(version)) return res.status(400).json({ error: 'Brak wersji posta.' });
  const input = parsePostInput(req.body);

  const sets = [];
  const params = [id, version, req.user.id];
  for (const [key, col] of Object.entries(COLUMN)) {
    if (!(key in input)) continue;
    params.push(key === 'data' ? JSON.stringify(input[key]) : input[key]);
    sets.push(`${col} = $${params.length}${key === 'data' ? '::jsonb' : ''}`);
    if (key === 'status') {
      sets.push(`published_at = CASE WHEN $${params.length}::text = 'published' THEN COALESCE(published_at, now()) ELSE NULL END`);
    }
  }

  const { rows } = await query(
    `UPDATE posts SET ${[...sets, 'version = version + 1', 'updated_at = now()', 'updated_by = $3'].join(', ')}
     WHERE id = $1 AND version = $2 RETURNING id`,
    params,
  );
  if (!rows[0]) {
    const current = await query('SELECT version FROM posts WHERE id = $1', [id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'Nie znaleziono posta.' });
    return res.status(409).json({
      error: 'Post został w międzyczasie zmieniony w innym miejscu.',
      currentVersion: current.rows[0].version,
    });
  }
  if (input.thumbnail) await replaceThumbnail(id, input.thumbnail, req.user.id);
  const updated = await query(`${SELECT_POST} WHERE p.id = $1`, [id]);
  res.json({ post: serialize(updated.rows[0], { full: req.query.full === '1' }) });
});

postsRouter.post('/:id/duplicate', async (req, res) => {
  const id = parseId(req);
  const { rows } = await query('SELECT * FROM posts WHERE id = $1', [id]);
  const src = rows[0];
  if (!src) return res.status(404).json({ error: 'Nie znaleziono posta.' });
  const thumbId = src.thumb_media_id ? await copyMedia(src.thumb_media_id, { userId: req.user.id }) : null;
  const inserted = await query(
    `INSERT INTO posts (title, mode, format, status, caption, data, thumb_media_id, created_by, updated_by)
     VALUES ($1, $2, $3, 'draft', $4, $5::jsonb, $6, $7, $7) RETURNING id`,
    [`${src.title} (kopia)`.slice(0, 200), src.mode, src.format, src.caption,
      JSON.stringify({ ...src.data, customTitle: src.data?.customTitle ? `${src.data.customTitle} (kopia)` : undefined }),
      thumbId, req.user.id],
  );
  const created = await query(`${SELECT_POST} WHERE p.id = $1`, [inserted.rows[0].id]);
  res.status(201).json({ post: serialize(created.rows[0]) });
});

postsRouter.delete('/:id', async (req, res) => {
  const { rows } = await query('DELETE FROM posts WHERE id = $1 RETURNING thumb_media_id', [parseId(req)]);
  if (!rows[0]) return res.status(404).json({ error: 'Nie znaleziono posta.' });
  // Miniaturę usuwamy od razu; zdjęcia slajdów sprząta `npm run media:cleanup` (mogą być współdzielone z kopiami).
  await deleteMedia(rows[0].thumb_media_id);
  res.json({ ok: true });
});
