// Testy API działającego panelu (np. lokalnego z dev/docker-compose.yml).
//   docker compose -f dev/docker-compose.yml up -d --build
//   npm test
// Zmienne: BASE_URL (domyślnie http://localhost:3000), TEST_USER / TEST_PASS (domyślnie konto testowe z docker-compose).
import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const USER = process.env.TEST_USER || 'admin';
const PASS = process.env.TEST_PASS || 'testowe-haslo';

// 1×1 px JPEG (wystarczy do sprawdzenia rozpoznawania typu)
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

let cookie = '';
async function req(method, url, { body, form, headers = {}, csrf = true } = {}) {
  const h = { ...headers };
  if (csrf) h['X-Requested-With'] = 'digguj';
  if (cookie) h.Cookie = cookie;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  // Tak jak przeglądarka: PUT/DELETE jako POST z nagłówkiem
  if (method === 'PUT' || method === 'DELETE') { h['X-HTTP-Method-Override'] = method; method = 'POST'; }
  const res = await fetch(BASE + url, { method, headers: h, body: payload, redirect: 'manual' });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(';');
    cookie = pair.endsWith('=') ? '' : pair;
  }
  const data = (res.headers.get('content-type') || '').includes('json') ? await res.json() : null;
  return { status: res.status, data, res };
}

describe('API panelu (PHP)', () => {
  let alive = false;
  before(async () => {
    try { alive = (await fetch(`${BASE}/healthz`)).ok; } catch { alive = false; }
  });

  const it = (name, fn) => test(name, async (t) => { if (!alive) return t.skip(`panel nie działa pod ${BASE}`); await fn(); });

  it('bez logowania: strony przekierowują, API zwraca 401, zdjęcia są chronione', async () => {
    const page = await req('GET', '/');
    assert.equal(page.status, 302);
    assert.match(page.res.headers.get('location'), /^\/login/);
    assert.equal((await req('GET', '/api/posts')).status, 401);
    assert.equal((await req('GET', '/media/00000000-0000-4000-8000-000000000000')).status, 401);
  });

  it('pliki serwera nie są dostępne z przeglądarki', async () => {
    for (const p of ['/app/Core.php', '/config.php', '/pages/index.html', '/migrations/001_init.sql', '/storage/uploads/.gitkeep', '/.htaccess', '/README.md']) {
      const s = (await fetch(BASE + p, { redirect: 'manual' })).status;
      assert.ok(s === 403 || s === 404, `${p} → ${s}`);
    }
  });

  it('logowanie: CSRF, obcy Origin, złe hasło, poprawne hasło', async () => {
    const body = { username: USER, password: PASS };
    assert.equal((await req('POST', '/api/auth/login', { body, csrf: false })).status, 403);
    assert.equal((await req('POST', '/api/auth/login', { body, headers: { Origin: 'https://zla-strona.pl' } })).status, 403);
    assert.equal((await req('POST', '/api/auth/login', { body: { ...body, password: 'zle-haslo' } })).status, 401);
    const ok = await req('POST', '/api/auth/login', { body: { ...body, username: USER.toUpperCase() } });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.user.username, USER);
    assert.equal((await req('GET', '/api/auth/me')).data.user.username, USER);
  });

  let post;
  it('tworzenie postów', async () => {
    const a = await req('POST', '/api/posts', { body: { mode: 'album' } });
    assert.equal(a.status, 201);
    assert.equal(a.data.post.format, 'carousel');
    assert.deepEqual(a.data.post.data, {});
    const cal = await req('POST', '/api/posts', { body: { mode: 'calendar' } });
    assert.equal(cal.data.post.format, 'reel');
    assert.equal((await req('POST', '/api/posts', { body: { mode: 'hack' } })).status, 400);
    assert.equal((await req('DELETE', `/api/posts/${cal.data.post.id}`)).status, 200);
    post = a.data.post;
  });

  it('upload zdjęć: poprawny JPEG, podrobiony plik', async () => {
    const good = new FormData();
    good.append('file', new Blob([JPEG], { type: 'image/jpeg' }), 'okładka.jpg');
    const up = await req('POST', '/api/media', { form: good });
    assert.equal(up.status, 201);
    const img = await req('GET', up.data.media.url);
    assert.equal(img.status, 200);
    assert.equal(img.res.headers.get('content-type'), 'image/jpeg');
    assert.equal(Buffer.from(await img.res.arrayBuffer()).length, JPEG.length);

    const fake = new FormData();
    fake.append('file', new Blob(['<?php echo "hack"; ?> i jeszcze troche'], { type: 'image/png' }), 'x.php');
    assert.equal((await req('POST', '/api/media', { form: fake })).status, 400);
    post.coverMediaId = up.data.media.id;
  });

  it('zapis z edytora + miniatura + kontrola wersji', async () => {
    const payload = {
      version: post.version,
      title: 'Daft Punk – RAM ✓',
      status: 'scheduled',
      scheduledAt: '2026-10-05T16:30:00.000Z',
      caption: 'Opis 🎧 z "cudzysłowem" i \\ backslashem',
      data: { albumArtist: 'Daft Punk', coverMediaId: post.coverMediaId, slides: [{ text: 'Fakt ąęś', mediaId: null, panX: 0, panY: -12 }], empty: {} },
      thumbnail: `data:image/jpeg;base64,${JPEG.toString('base64')}`,
    };
    const saved = await req('PUT', `/api/posts/${post.id}`, { body: payload });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.equal(saved.data.post.version, post.version + 1);
    assert.ok(saved.data.post.thumbUrl);

    const stale = await req('PUT', `/api/posts/${post.id}`, { body: { ...payload, thumbnail: null } });
    assert.equal(stale.status, 409);
    assert.equal(stale.data.currentVersion, post.version + 1);

    const full = await req('GET', `/api/posts/${post.id}`);
    assert.equal(full.data.post.data.albumArtist, 'Daft Punk');
    assert.equal(full.data.post.data.slides[0].text, 'Fakt ąęś');
    assert.deepEqual(full.data.post.data.empty, {});
    assert.equal(full.data.post.caption, payload.caption);
    assert.equal(full.data.post.status, 'scheduled');
    assert.equal(full.data.post.scheduledAt, '2026-10-05T16:30:00Z');
    post = full.data.post;

    const published = await req('PUT', `/api/posts/${post.id}`, { body: { version: post.version, status: 'published' } });
    assert.ok(published.data.post.publishedAt);
    post = published.data.post;
  });

  it('lista i wyszukiwanie', async () => {
    const list = await req('GET', `/api/posts?q=${encodeURIComponent('RAM ✓')}`);
    assert.ok(list.data.posts.some((p) => p.id === post.id));
    assert.equal(list.data.posts[0].data, undefined, 'lista nie zwraca pełnych danych edytora');
    assert.ok((await req('GET', '/api/posts?status=published')).data.posts.some((p) => p.id === post.id));
    assert.equal((await req('GET', '/api/posts?q=%25')).status, 200);
  });

  it('duplikowanie i usuwanie', async () => {
    const dup = await req('POST', `/api/posts/${post.id}/duplicate`);
    assert.equal(dup.status, 201);
    assert.equal(dup.data.post.status, 'draft');
    assert.match(dup.data.post.title, /\(kopia\)$/);
    assert.notEqual(dup.data.post.thumbUrl, post.thumbUrl);
    assert.equal((await req('DELETE', `/api/posts/${post.id}`)).status, 200);
    assert.equal((await req('GET', `/api/posts/${post.id}`)).status, 404);
    assert.equal((await req('GET', post.thumbUrl)).status, 404, 'miniatura usuniętego posta znika');
    assert.equal((await req('GET', dup.data.post.thumbUrl)).status, 200, 'miniatura kopii zostaje');
    await req('DELETE', `/api/posts/${dup.data.post.id}`);
  });

  it('ustawienia: domyślne teksty CTA', async () => {
    assert.equal((await req('GET', '/api/settings/cokolwiek')).status, 404);
    assert.equal((await req('PUT', '/api/settings/ctaDefaults', { body: { value: { ctaTitle: 123 } } })).status, 400);
    const value = { ctaTitle: 'UDOSTĘPNIJ!', ctaHandle: '@digguj', ctaStyle: 'medallion' };
    const saved = await req('PUT', '/api/settings/ctaDefaults', { body: { value: { ...value, obce: 'x' } } });
    assert.equal(saved.status, 200);
    assert.deepEqual((await req('GET', '/api/settings/ctaDefaults')).data.value, value);
    await req('PUT', '/api/settings/ctaDefaults', { body: { value: {} } });
  });

  it('wylogowanie', async () => {
    assert.equal((await req('POST', '/api/auth/logout')).status, 200);
    assert.equal((await req('GET', '/api/posts')).status, 401);
  });
});
