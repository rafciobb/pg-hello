-- Wizualizacja feeda została usunięta z panelu – numer posta w feedzie nie jest już potrzebny.
DROP INDEX IF EXISTS posts_feed_number_idx;
ALTER TABLE posts DROP COLUMN IF EXISTS feed_number;
