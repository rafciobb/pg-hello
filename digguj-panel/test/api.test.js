// Testy API na prawdziwej bazie PostgreSQL.
// Uruchomienie: TEST_DATABASE_URL=postgres://user:pass@localhost:5432/digguj_test npm test
// UWAGA: baza testowa jest czyszczona – nigdy nie wskazuj tu bazy produkcyjnej!
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const TEST_DB = process.env.TEST_DATABASE_URL;

describe('API panelu', { skip: !TEST_DB && 'ustaw TEST_DATABASE_URL, aby uruchomić testy API' }, () => {
  let server, base, pool, uploadDir;
  let cookie = '';

  // 1×1 px JPEG
  const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

  async function req(method, url, { body, form, headers = {}, csrf = true } = {}) {
    const h = { ...headers };
    if (csrf) h['X-Requested-With'] = 'digguj';
    if (cookie) h.Cookie = cookie;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const res = await fetch(base + url, { method, headers: h, body: payload, redirect: 'manual' });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const data = (res.headers.get('content-type') || '').includes('json') ? await res.json() : null;
    return { status: res.status, data, res };
  }

  before(async () => {
    uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'digguj-test-'));
    Object.assign(process.env, {
      DATABASE_URL: TEST_DB,
      SESSION_SECRET: 'test-secret-test-secret-test-secret-123',
      COOKIE_SECURE: 'false',
      UPLOAD_DIR: uploadDir,
      NODE_ENV: 'test',
    });
    const { config } = await import('../server/config.js');
    if (config.databaseUrl !== TEST_DB) throw new Error('Bezpiecznik: testy nie używają TEST_DATABASE_URL – przerywam.');
    const db = await import('../server/db.js');
    pool = db.pool;
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await (await import('../server/migrate.js')).migrate({ log: () => {} });
    const { hashPassword } = await import('../server/auth.js');
    await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', ['tester', await hashPassword('tajne-haslo-123')]);
    const { createApp } = await import('../server/app.js');
    const { default: session } = await import('express-session');
    server = createApp({ sessionStore: new session.MemoryStore() }).listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    server?.close();
    await pool?.end();
    await fs.rm(uploadDir, { recursive: true, force: true });
  });

  test('bez logowania: strony przekierowują, API zwraca 401', async () => {
    const page = await req('GET', '/');
    assert.equal(page.status, 302);
    assert.match(page.res.headers.get('location'), /^\/login/);
    assert.equal((await req('GET', '/api/posts')).status, 401);
  });

  test('logowanie: CSRF, złe hasło, poprawne hasło', async () => {
    const body = { username: 'tester', password: 'tajne-haslo-123' };
    assert.equal((await req('POST', '/api/auth/login', { body, csrf: false })).status, 403);
    assert.equal((await req('POST', '/api/auth/login', { body, headers: { Origin: 'https://zla-strona.pl' } })).status, 403);
    assert.equal((await req('POST', '/api/auth/login', { body: { ...body, password: 'zle' } })).status, 401);
    const ok = await req('POST', '/api/auth/login', { body: { ...body, username: 'TESTER' } });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.user.username, 'tester');
  });

  let post;
  test('tworzenie postów', async () => {
    const a = await req('POST', '/api/posts', { body: { mode: 'album' } });
    assert.equal(a.status, 201);
    assert.equal(a.data.post.format, 'carousel');
    const cal = await req('POST', '/api/posts', { body: { mode: 'calendar' } });
    assert.equal(cal.data.post.format, 'reel');
    assert.equal((await req('POST', '/api/posts', { body: { mode: 'general' } })).status, 201);
    assert.equal((await req('POST', '/api/posts', { body: { mode: 'hack' } })).status, 400);
    post = a.data.post;
  });

  test('upload zdjęć: poprawny JPEG, podrobiony plik', async () => {
    const good = new FormData();
    good.append('file', new Blob([JPEG], { type: 'image/jpeg' }), 'okladka.jpg');
    const up = await req('POST', '/api/media', { form: good });
    assert.equal(up.status, 201);
    const img = await req('GET', up.data.media.url);
    assert.equal(img.status, 200);
    assert.equal(img.res.headers.get('content-type'), 'image/jpeg');

    const fake = new FormData();
    fake.append('file', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'x.png');
    assert.equal((await req('POST', '/api/media', { form: fake })).status, 400);
    post.coverMediaId = up.data.media.id;
  });

  test('zapis z edytora + miniatura + kontrola wersji', async () => {
    const payload = {
      version: post.version,
      title: 'Daft Punk – RAM',
      status: 'scheduled',
      scheduledAt: '2026-10-05T16:30:00.000Z',
      caption: 'Opis 🎧',
      data: { albumArtist: 'Daft Punk', coverMediaId: post.coverMediaId, slides: [{ text: 'Fakt', mediaId: null, panX: 0, panY: 0 }] },
      thumbnail: `data:image/jpeg;base64,${JPEG.toString('base64')}`,
    };
    const saved = await req('PUT', `/api/posts/${post.id}`, { body: payload });
    assert.equal(saved.status, 200);
    assert.equal(saved.data.post.version, post.version + 1);
    assert.ok(saved.data.post.thumbUrl);

    const stale = await req('PUT', `/api/posts/${post.id}`, { body: { ...payload, thumbnail: null } });
    assert.equal(stale.status, 409);

    const full = await req('GET', `/api/posts/${post.id}`);
    assert.equal(full.data.post.data.albumArtist, 'Daft Punk');
    assert.equal(full.data.post.status, 'scheduled');
    post = full.data.post;

    const published = await req('PUT', `/api/posts/${post.id}`, { body: { version: post.version, status: 'published' } });
    assert.ok(published.data.post.publishedAt);
    post = published.data.post;
  });

  test('lista i wyszukiwanie', async () => {
    const list = await req('GET', '/api/posts?q=daft');
    assert.equal(list.data.posts.length, 1);
    assert.equal(list.data.posts[0].data, undefined, 'lista nie zwraca pełnych danych edytora');
    assert.equal((await req('GET', '/api/posts?status=published')).data.posts.length, 1);
    assert.equal((await req('GET', '/api/posts?mode=calendar')).data.posts.length, 1);
  });

  test('duplikowanie i usuwanie', async () => {
    const dup = await req('POST', `/api/posts/${post.id}/duplicate`);
    assert.equal(dup.status, 201);
    assert.equal(dup.data.post.status, 'draft');
    assert.notEqual(dup.data.post.thumbUrl, post.thumbUrl);
    assert.equal((await req('DELETE', `/api/posts/${post.id}`)).status, 200);
    assert.equal((await req('GET', `/api/posts/${post.id}`)).status, 404);
    // miniatura kopii nadal działa
    assert.equal((await req('GET', dup.data.post.thumbUrl)).status, 200);
  });

  test('wylogowanie', async () => {
    assert.equal((await req('POST', '/api/auth/logout')).status, 200);
    assert.equal((await req('GET', '/api/posts')).status, 401);
  });
});
