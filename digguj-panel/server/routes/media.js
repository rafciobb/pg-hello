import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { query } from '../db.js';

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rozpoznaje typ obrazu po "magicznych bajtach" – nie ufamy rozszerzeniu ani nagłówkowi od klienta. */
export function detectImageMime(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  return null;
}

export function mediaUrl(id) {
  return id ? `/media/${id}` : null;
}

/** Zapisuje bufor obrazu na dysk i rejestruje go w tabeli media. Zwraca id. */
export async function storeImageBuffer(buffer, { kind = 'image', originalName = null, userId = null } = {}) {
  const mime = detectImageMime(buffer);
  if (!mime) throw Object.assign(new Error('Nieobsługiwany format obrazu.'), { status: 400 });
  const id = crypto.randomUUID();
  const filename = `${id}.${EXT_BY_MIME[mime]}`;
  await fs.writeFile(path.join(config.uploadDir, filename), buffer);
  await query(
    `INSERT INTO media (id, kind, filename, original_name, mime, size_bytes, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, kind, filename, originalName, mime, buffer.length, userId],
  );
  return id;
}

export async function copyMedia(id, { userId = null } = {}) {
  const { rows } = await query('SELECT * FROM media WHERE id = $1', [id]);
  if (!rows[0]) return null;
  const buffer = await fs.readFile(path.join(config.uploadDir, rows[0].filename));
  return storeImageBuffer(buffer, { kind: rows[0].kind, originalName: rows[0].original_name, userId });
}

export async function deleteMedia(id) {
  if (!id) return;
  const { rows } = await query('DELETE FROM media WHERE id = $1 RETURNING filename', [id]);
  if (rows[0]) await fs.rm(path.join(config.uploadDir, rows[0].filename), { force: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXT_BY_MIME[file.mimetype]) cb(null, true);
    else cb(Object.assign(new Error('Dozwolone są tylko obrazy JPG, PNG, WEBP i GIF.'), { status: 400 }));
  },
});

/** /api/media – przesyłanie plików */
export const mediaApiRouter = Router();

mediaApiRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nie wybrano pliku.' });
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8').slice(0, 255);
  const id = await storeImageBuffer(req.file.buffer, { originalName, userId: req.user.id });
  res.status(201).json({ media: { id, url: mediaUrl(id) } });
});

/** /media/:id – serwowanie plików (tylko dla zalogowanych) */
export const mediaServeRouter = Router();

mediaServeRouter.get('/:id', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).end();
  const { rows } = await query('SELECT filename, mime FROM media WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).end();
  res.sendFile(path.join(config.uploadDir, rows[0].filename), {
    headers: {
      'Content-Type': rows[0].mime,
      // ID pliku nigdy się nie zmienia, więc przeglądarka może go trzymać w cache
      'Cache-Control': 'private, max-age=31536000, immutable',
    },
  });
});
