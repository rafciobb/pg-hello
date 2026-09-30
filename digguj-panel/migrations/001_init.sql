-- Użytkownicy panelu (brak publicznej rejestracji – konta zakłada się skryptem npm run user:create)
CREATE TABLE users (
  id            serial PRIMARY KEY,
  username      text NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE UNIQUE INDEX users_username_lower_idx ON users (lower(username));

-- Pliki przesłane na serwer (zdjęcia do slajdów, miniatury postów)
CREATE TABLE media (
  id            uuid PRIMARY KEY,
  kind          text NOT NULL DEFAULT 'image' CHECK (kind IN ('image', 'thumbnail')),
  filename      text NOT NULL,
  original_name text,
  mime          text NOT NULL,
  size_bytes    integer NOT NULL,
  uploaded_by   integer REFERENCES users (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Posty. Kolumny = to, po czym filtrujemy/sortujemy; `data` (JSONB) = pełny stan edytora,
-- dzięki czemu nowe opcje w edytorze nie wymagają zmian w schemacie bazy.
CREATE TABLE posts (
  id             serial PRIMARY KEY,
  title          text NOT NULL DEFAULT '',
  mode           text NOT NULL CHECK (mode IN ('album', 'general', 'calendar')),
  format         text NOT NULL CHECK (format IN ('carousel', 'reel', 'video')),
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'scheduled', 'published')),
  scheduled_at   timestamptz,
  published_at   timestamptz,
  feed_number    integer,
  caption        text NOT NULL DEFAULT '',
  data           jsonb NOT NULL DEFAULT '{}'::jsonb,
  thumb_media_id uuid REFERENCES media (id) ON DELETE SET NULL,
  version        integer NOT NULL DEFAULT 1,
  created_by     integer REFERENCES users (id) ON DELETE SET NULL,
  updated_by     integer REFERENCES users (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_status_idx ON posts (status);
CREATE INDEX posts_scheduled_at_idx ON posts (scheduled_at);
CREATE INDEX posts_feed_number_idx ON posts (feed_number);
CREATE INDEX posts_updated_at_idx ON posts (updated_at DESC);

-- Sesje logowania (connect-pg-simple)
CREATE TABLE session (
  sid    varchar NOT NULL COLLATE "default" PRIMARY KEY,
  sess   json NOT NULL,
  expire timestamp(6) NOT NULL
);
CREATE INDEX session_expire_idx ON session (expire);
