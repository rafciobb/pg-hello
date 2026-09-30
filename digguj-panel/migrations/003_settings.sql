-- Ustawienia panelu (klucz → wartość JSON), np. domyślne teksty slajdu CTA dla nowych postów
CREATE TABLE settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_by integer REFERENCES users (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
