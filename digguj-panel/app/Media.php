<?php
declare(strict_types=1);

namespace Digguj;

final class Media
{
    public const EXT_BY_MIME = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    public static function dir(): string
    {
        return APP_ROOT . '/storage/uploads';
    }

    public static function url(?string $id): ?string
    {
        return $id ? '/media/' . $id : null;
    }

    /** Typ obrazu rozpoznany po "magicznych bajtach" – nie ufamy rozszerzeniu ani nagłówkom od klienta. */
    public static function detectMime(string $head): ?string
    {
        if (strlen($head) < 12) {
            return null;
        }
        if (str_starts_with($head, "\xFF\xD8\xFF")) {
            return 'image/jpeg';
        }
        if (str_starts_with($head, "\x89PNG\r\n\x1A\n")) {
            return 'image/png';
        }
        if (substr($head, 0, 4) === 'RIFF' && substr($head, 8, 4) === 'WEBP') {
            return 'image/webp';
        }
        if (str_starts_with($head, 'GIF8')) {
            return 'image/gif';
        }
        return null;
    }

    /** Zapisuje obraz (z pliku tymczasowego albo bufora) i rejestruje go w bazie. Zwraca id. */
    public static function store(string $bytes, string $kind, ?string $originalName, ?int $userId): string
    {
        $mime = self::detectMime(substr($bytes, 0, 16));
        if (!$mime) {
            throw new HttpError(400, 'Nieobsługiwany format obrazu.');
        }
        $id = uuid4();
        $filename = $id . '.' . self::EXT_BY_MIME[$mime];
        if (!is_dir(self::dir()) && !mkdir(self::dir(), 0755, true)) {
            throw new \RuntimeException('Nie można utworzyć katalogu storage/uploads.');
        }
        if (file_put_contents(self::dir() . '/' . $filename, $bytes, LOCK_EX) === false) {
            throw new \RuntimeException('Nie udało się zapisać pliku (sprawdź uprawnienia storage/uploads).');
        }
        Db::exec(
            'INSERT INTO media (id, kind, filename, original_name, mime, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$id, $kind, $filename, $originalName, $mime, strlen($bytes), $userId],
        );
        return $id;
    }

    public static function copy(string $id, ?int $userId): ?string
    {
        $row = Db::one('SELECT * FROM media WHERE id = ?', [$id]);
        $path = $row ? self::dir() . '/' . $row['filename'] : null;
        if (!$path || !is_file($path)) {
            return null;
        }
        return self::store((string) file_get_contents($path), $row['kind'], $row['original_name'], $userId);
    }

    public static function delete(?string $id): void
    {
        if (!$id) {
            return;
        }
        $row = Db::one('SELECT filename FROM media WHERE id = ?', [$id]);
        if ($row) {
            Db::exec('DELETE FROM media WHERE id = ?', [$id]);
            @unlink(self::dir() . '/' . $row['filename']);
        }
    }

    private static function iniBytes(string $key): int
    {
        $v = trim((string) ini_get($key));
        $n = (int) $v;
        return match (strtolower(substr($v, -1))) {
            'g' => $n * 1024 ** 3,
            'm' => $n * 1024 ** 2,
            'k' => $n * 1024,
            default => $n,
        };
    }

    /** Maksymalny rozmiar pliku: mniejsza z wartości z konfiguracji panelu i limitów PHP na hostingu. */
    public static function maxBytes(): int
    {
        $limits = [(int) Config::get()['max_upload_mb'] * 1024 * 1024];
        foreach (['upload_max_filesize', 'post_max_size'] as $k) {
            $b = self::iniBytes($k);
            if ($b > 0) {
                $limits[] = $b;
            }
        }
        return min($limits);
    }

    /** POST /api/media */
    public static function upload(array $user): never
    {
        $max = self::maxBytes();
        $mb = round($max / 1024 / 1024, 1);
        // Gdy żądanie przekroczy post_max_size, PHP po cichu gubi całe $_FILES
        if (empty($_FILES) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
            throw new HttpError(413, "Plik jest za duży (maks. {$mb} MB).");
        }
        $f = $_FILES['file'] ?? null;
        if (!$f || is_array($f['error'])) {
            throw new HttpError(400, 'Nie wybrano pliku.');
        }
        if (in_array($f['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) || $f['size'] > $max) {
            throw new HttpError(413, "Plik jest za duży (maks. {$mb} MB).");
        }
        if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) {
            throw new HttpError(400, 'Nie udało się przesłać pliku.');
        }
        $name = mb_substr(basename((string) $f['name']), 0, 255);
        $id = self::store((string) file_get_contents($f['tmp_name']), 'image', $name, $user['id']);
        Http::json(['media' => ['id' => $id, 'url' => self::url($id)]], 201);
    }

    /** GET /media/{id} – tylko dla zalogowanych */
    public static function serve(string $id): never
    {
        $row = Db::one('SELECT filename, mime FROM media WHERE id = ?', [$id]);
        $path = $row ? self::dir() . '/' . $row['filename'] : null;
        if (!$path || !is_file($path)) {
            http_response_code(404);
            exit;
        }
        header('Content-Type: ' . $row['mime']);
        header('Content-Length: ' . filesize($path));
        // ID pliku nigdy się nie zmienia, więc przeglądarka może go trzymać w pamięci podręcznej
        header('Cache-Control: private, max-age=31536000, immutable');
        header('X-Content-Type-Options: nosniff');
        if (Http::method() !== 'HEAD') {
            readfile($path);
        }
        exit;
    }
}

final class Settings
{
    private const CTA_KEYS = ['ctaEnabled', 'ctaStyle', 'ctaLabel', 'ctaTitle', 'ctaText', 'ctaHandle'];

    private static function validate(string $name, mixed $value): array
    {
        if ($name !== 'ctaDefaults') {
            throw new HttpError(404, 'Nieznane ustawienie.');
        }
        if (!is_array($value) || ($value !== [] && array_is_list($value))) {
            throw new HttpError(400, 'Nieprawidłowe ustawienia CTA.');
        }
        $out = [];
        foreach (self::CTA_KEYS as $k) {
            if (!array_key_exists($k, $value)) {
                continue;
            }
            if (!is_string($value[$k]) || mb_strlen($value[$k]) > 500) {
                throw new HttpError(400, "Nieprawidłowa wartość pola {$k}.");
            }
            $out[$k] = $value[$k];
        }
        return $out;
    }

    public static function get(string $name): never
    {
        self::validate($name, []);
        $row = Db::one('SELECT value FROM settings WHERE name = ?', [$name]);
        Http::json(['value' => $row ? json_decode($row['value'], false) : null]);
    }

    public static function put(string $name, array $user): never
    {
        $value = self::validate($name, Http::body()['value'] ?? null);
        Db::exec(
            'INSERT INTO settings (name, value, updated_by, updated_at) VALUES (?, ?, ?, UTC_TIMESTAMP())
             ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by), updated_at = UTC_TIMESTAMP()',
            [$name, json_encode((object) $value, JSON_UNESCAPED_UNICODE), $user['id']],
        );
        Http::json(['value' => (object) $value]);
    }
}
