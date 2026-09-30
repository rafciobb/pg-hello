import path from 'node:path';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import helmet from 'helmet';
import { config } from './config.js';
import { pool } from './db.js';
import { authRouter, csrfGuard, loadUser, requireAuth, requirePage } from './auth.js';
import { postsRouter } from './routes/posts.js';
import { mediaApiRouter, mediaServeRouter } from './routes/media.js';

const PUBLIC = path.join(config.root, 'public');
const PAGES = path.join(PUBLIC, 'pages');

// Biblioteki przeglądarkowe serwujemy z node_modules – bez zależności od zewnętrznych CDN.
const VENDOR = {
  'jszip.min.js': 'node_modules/jszip/dist/jszip.min.js',
  'mp4-muxer.js': 'node_modules/mp4-muxer/build/mp4-muxer.js',
};

export function createApp({ sessionStore } = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'blob:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        ...(config.cookieSecure ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  // Pliki statyczne (CSS/JS/logotypy) – publiczne, nie zawierają danych.
  const staticOpts = { index: false, maxAge: config.isProd ? '1h' : 0 };
  app.use('/css', express.static(path.join(PUBLIC, 'css'), staticOpts));
  app.use('/js', express.static(path.join(PUBLIC, 'js'), staticOpts));
  app.use('/assets', express.static(path.join(PUBLIC, 'assets'), staticOpts));
  for (const family of ['dm-sans', 'montserrat', 'space-mono']) {
    app.use(`/fonts/${family}`, express.static(path.join(config.root, 'node_modules/@fontsource', family), { index: false, maxAge: '30d' }));
  }
  app.get('/vendor/:file', (req, res, next) => {
    const rel = VENDOR[req.params.file];
    if (!rel) return next();
    res.sendFile(path.join(config.root, rel), { maxAge: '7d' });
  });

  app.use(express.json({ limit: '5mb' }));
  app.use(session({
    name: 'digguj.sid',
    store: sessionStore ?? new (connectPgSimple(session))({ pool, tableName: 'session', pruneSessionInterval: 60 * 15 }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.cookieSecure,
      maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
    },
  }));
  app.use(loadUser);

  // Strony
  const noStore = (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };
  app.get('/login', noStore, (req, res) => {
    if (req.user) return res.redirect('/');
    res.sendFile(path.join(PAGES, 'login.html'));
  });
  app.get('/', noStore, requirePage, (_req, res) => res.sendFile(path.join(PAGES, 'index.html')));
  app.get('/editor', noStore, requirePage, (_req, res) => res.sendFile(path.join(PAGES, 'editor.html')));

  // API
  app.use('/api', noStore, csrfGuard);
  app.use('/api/auth', authRouter);
  app.use('/api/posts', requireAuth, postsRouter);
  app.use('/api/media', requireAuth, mediaApiRouter);
  app.use('/media', requireAuth, mediaServeRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Nie znaleziono.' }));
  app.use((_req, res) => res.status(404).type('text').send('404 – nie znaleziono'));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    let status = err.status || err.statusCode || 500;
    let message = err.expose || status < 500 ? err.message : 'Błąd serwera.';
    if (err.code === 'LIMIT_FILE_SIZE') { status = 413; message = `Plik jest za duży (maks. ${config.maxUploadMb} MB).`; }
    else if (err.type === 'entity.too.large') { status = 413; message = 'Za duże dane.'; }
    if (status >= 500) console.error(`[błąd] ${req.method} ${req.originalUrl}`, err);
    if (req.originalUrl.startsWith('/api')) res.status(status).json({ error: message });
    else res.status(status).type('text').send(message);
  });

  return app;
}
