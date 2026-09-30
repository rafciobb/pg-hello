-- Schemat bazy panelu (MySQL 5.7+ / MariaDB 10.3+). Daty zapisywane w UTC.

-- Użytkownicy (brak publicznej rejestracji – konta zakłada się na stronie /install)
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(10)  NOT NULL DEFAULT 'admin',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME     NULL,
  UNIQUE KEY users_username_uq (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Przesłane pliki (zdjęcia do slajdów, miniatury postów); same pliki leżą w storage/uploads
CREATE TABLE IF NOT EXISTS media (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  kind          VARCHAR(10)  NOT NULL DEFAULT 'image',
  filename      VARCHAR(64)  NOT NULL,
  original_name VARCHAR(255) NULL,
  mime          VARCHAR(32)  NOT NULL,
  size_bytes    INT UNSIGNED NOT NULL,
  uploaded_by   INT UNSIGNED NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY media_kind_created (kind, created_at),
  CONSTRAINT media_user_fk FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Posty. Kolumny = to, po czym filtrujemy/sortujemy; `data` (JSON) = pełny stan edytora,
-- dzięki czemu nowe opcje w edytorze nie wymagają zmian w bazie.
CREATE TABLE IF NOT EXISTS posts (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(200) NOT NULL DEFAULT '',
  mode           VARCHAR(10)  NOT NULL,
  format         VARCHAR(10)  NOT NULL,
  status         VARCHAR(10)  NOT NULL DEFAULT 'draft',
  scheduled_at   DATETIME     NULL,
  published_at   DATETIME     NULL,
  caption        TEXT         NOT NULL,
  data           MEDIUMTEXT   NOT NULL,
  thumb_media_id CHAR(36)     NULL,
  version        INT UNSIGNED NOT NULL DEFAULT 1,
  created_by     INT UNSIGNED NULL,
  updated_by     INT UNSIGNED NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY posts_status (status),
  KEY posts_scheduled (scheduled_at),
  KEY posts_updated (updated_at),
  CONSTRAINT posts_thumb_fk FOREIGN KEY (thumb_media_id) REFERENCES media (id) ON DELETE SET NULL,
  CONSTRAINT posts_created_by_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT posts_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ustawienia panelu (np. domyślne teksty slajdu CTA)
CREATE TABLE IF NOT EXISTS settings (
  name       VARCHAR(64)  NOT NULL PRIMARY KEY,
  value      MEDIUMTEXT   NOT NULL,
  updated_by INT UNSIGNED NULL,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT settings_user_fk FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sesje logowania
CREATE TABLE IF NOT EXISTS sessions (
  id         VARCHAR(128) NOT NULL PRIMARY KEY,
  user_id    INT UNSIGNED NULL,
  data       MEDIUMBLOB   NOT NULL,
  expires_at INT UNSIGNED NOT NULL,
  KEY sessions_expires (expires_at),
  KEY sessions_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nieudane logowania (ochrona przed zgadywaniem haseł)
CREATE TABLE IF NOT EXISTS login_attempts (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ip         VARCHAR(45)  NOT NULL,
  created_at INT UNSIGNED NOT NULL,
  KEY login_attempts_ip_time (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
