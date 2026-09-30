<?php
declare(strict_types=1);

namespace Digguj;

/** Błąd HTTP z kodem i komunikatem, który można bezpiecznie pokazać użytkownikowi. */
final class HttpError extends \RuntimeException
{
    public function __construct(public readonly int $status, string $message, public readonly array $extra = [])
    {
        parent::__construct($message);
    }
}

/**
 * Konfiguracja: config.php (hosting) albo zmienne środowiskowe DIGGUJ_* (test lokalny w Dockerze).
 */
final class Config
{
    private static ?array $cfg = null;
    private static bool $loaded = false;

    private const DEFAULTS = [
        'db' => ['host' => 'localhost', 'port' => 3306, 'name' => '', 'user' => '', 'pass' => ''],
        'setup_key' => '',
        'max_upload_mb' => 25,
        'session_days' => 14,
    ];

    public static function file(): string
    {
        return APP_ROOT . '/config.php';
    }

    /** Zwraca konfigurację albo null, jeśli panel nie jest jeszcze zainstalowany. */
    public static function load(): ?array
    {
        if (self::$loaded) {
            return self::$cfg;
        }
        self::$loaded = true;
        $envHost = getenv('DIGGUJ_DB_HOST');
        if ($envHost !== false && $envHost !== '') {
            self::$cfg = array_replace_recursive(self::DEFAULTS, [
                'db' => [
                    'host' => $envHost,
                    'port' => (int) (getenv('DIGGUJ_DB_PORT') ?: 3306),
                    'name' => (string) getenv('DIGGUJ_DB_NAME'),
                    'user' => (string) getenv('DIGGUJ_DB_USER'),
                    'pass' => (string) getenv('DIGGUJ_DB_PASS'),
                ],
                'setup_key' => (string) getenv('DIGGUJ_SETUP_KEY'),
                'max_upload_mb' => (int) (getenv('DIGGUJ_MAX_UPLOAD_MB') ?: 25),
            ]);
        } elseif (is_file(self::file())) {
            $c = require self::file();
            self::$cfg = is_array($c) ? array_replace_recursive(self::DEFAULTS, $c) : null;
        }
        return self::$cfg;
    }

    public static function get(): array
    {
        $c = self::load();
        if ($c === null) {
            throw new HttpError(503, 'Panel nie jest jeszcze zainstalowany – otwórz /install.');
        }
        return $c;
    }
}

final class Db
{
    private static ?\PDO $pdo = null;

    public static function connect(array $db): \PDO
    {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $db['host'], (int) $db['port'], $db['name']);
        $pdo = new \PDO($dsn, $db['user'], $db['pass'], [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES => false,
            \PDO::MYSQL_ATTR_FOUND_ROWS => true, // rowCount() = dopasowane wiersze, nie tylko zmienione
        ]);
        $pdo->exec("SET time_zone = '+00:00'"); // wszystkie daty w bazie w UTC
        return $pdo;
    }

    public static function pdo(): \PDO
    {
        return self::$pdo ??= self::connect(Config::get()['db']);
    }

    public static function use(\PDO $pdo): void
    {
        self::$pdo = $pdo;
    }

    public static function run(string $sql, array $params = []): \PDOStatement
    {
        $st = self::pdo()->prepare($sql);
        $st->execute(array_values($params));
        return $st;
    }

    public static function all(string $sql, array $params = []): array
    {
        return self::run($sql, $params)->fetchAll();
    }

    public static function one(string $sql, array $params = []): ?array
    {
        $row = self::run($sql, $params)->fetch();
        return $row === false ? null : $row;
    }

    public static function exec(string $sql, array $params = []): int
    {
        return self::run($sql, $params)->rowCount();
    }

    public static function lastId(): int
    {
        return (int) self::pdo()->lastInsertId();
    }
}

/**
 * Migracje: pliki migrations/NNN_nazwa.sql wykonywane po kolei (każdy raz).
 * Zmiany w bazie ZAWSZE dodajemy nowym plikiem – nie edytujemy już wykonanych.
 */
final class Migrator
{
    public static function run(): void
    {
        $pdo = Db::pdo();
        $files = glob(APP_ROOT . '/migrations/*.sql') ?: [];
        sort($files);
        $pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (
            name VARCHAR(191) NOT NULL PRIMARY KEY,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

        $done = array_column(Db::all('SELECT name FROM schema_migrations'), 'name');
        $pending = array_filter($files, fn ($f) => !in_array(basename($f), $done, true));
        if (!$pending) {
            return;
        }
        Db::one("SELECT GET_LOCK('digguj_migrate', 15)");
        try {
            $done = array_column(Db::all('SELECT name FROM schema_migrations'), 'name');
            foreach ($pending as $file) {
                $name = basename($file);
                if (in_array($name, $done, true)) {
                    continue;
                }
                foreach (self::statements((string) file_get_contents($file)) as $sql) {
                    $pdo->exec($sql);
                }
                Db::exec('INSERT INTO schema_migrations (name) VALUES (?)', [$name]);
            }
        } finally {
            Db::one("SELECT RELEASE_LOCK('digguj_migrate')");
        }
    }

    /** Dzieli plik SQL na pojedyncze polecenia (średnik na końcu linii kończy polecenie). */
    private static function statements(string $sql): array
    {
        $sql = preg_replace('/^\s*--.*$/m', '', $sql) ?? '';
        $parts = preg_split('/;\s*(?:\r?\n|$)/', $sql) ?: [];
        return array_values(array_filter(array_map('trim', $parts), fn ($s) => $s !== ''));
    }
}

/** Pomocnicze funkcje HTTP. */
final class Http
{
    public static function isHttps(): bool
    {
        return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'
            || ($_SERVER['SERVER_PORT'] ?? '') === '443';
    }

    public static function method(): string
    {
        $m = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        // Część hostingów blokuje PUT/DELETE – panel wysyła je jako POST z nagłówkiem
        $override = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? '');
        if ($m === 'POST' && in_array($override, ['PUT', 'DELETE', 'PATCH'], true)) {
            return $override;
        }
        return $m;
    }

    public static function path(): string
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        return '/' . ltrim(rawurldecode($path), '/');
    }

    public static function securityHeaders(): void
    {
        $csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; "
            . "img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; "
            . "base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
        if (self::isHttps()) {
            $csp .= '; upgrade-insecure-requests';
            header('Strict-Transport-Security: max-age=31536000');
        }
        header('Content-Security-Policy: ' . $csp);
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: same-origin');
        header('X-Robots-Tag: noindex, nofollow');
        header_remove('X-Powered-By');
    }

    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        exit;
    }

    private static function rawBody(): string
    {
        static $raw = null;
        return $raw ??= (file_get_contents('php://input', false, null, 0, 6 * 1024 * 1024) ?: '');
    }

    /** Treść żądania JSON jako tablica. */
    public static function body(): array
    {
        static $body = null;
        if ($body !== null) {
            return $body;
        }
        if (self::rawBody() === '') {
            return $body = [];
        }
        $decoded = json_decode(self::rawBody(), true);
        if (!is_array($decoded)) {
            throw new HttpError(400, 'Nieprawidłowe dane (JSON).');
        }
        return $body = $decoded;
    }

    /** Treść żądania z zachowaniem obiektów (np. pusty {} nie zamienia się w []). */
    public static function bodyObject(): object
    {
        $decoded = json_decode(self::rawBody() ?: '{}', false);
        return is_object($decoded) ? $decoded : new \stdClass();
    }

    /** Ochrona CSRF: nagłówek X-Requested-With (formularz z obcej strony go nie ustawi) + zgodny Origin. */
    public static function csrfGuard(): void
    {
        if (in_array(self::method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }
        if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'digguj') {
            throw new HttpError(403, 'Odrzucono żądanie (CSRF).');
        }
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '') {
            $originHost = parse_url($origin, PHP_URL_HOST);
            $originPort = parse_url($origin, PHP_URL_PORT);
            $host = $_SERVER['HTTP_HOST'] ?? '';
            $hostOnly = explode(':', $host)[0];
            if (strcasecmp((string) $originHost, $hostOnly) !== 0 || ($originPort !== null && !str_ends_with($host, ':' . $originPort))) {
                throw new HttpError(403, 'Odrzucono żądanie (Origin).');
            }
        }
    }

    public static function clientIp(): string
    {
        return substr($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0', 0, 45);
    }
}

/** Daty z bazy (UTC, "Y-m-d H:i:s") → ISO 8601. */
function iso(?string $value): ?string
{
    return $value === null ? null : str_replace(' ', 'T', $value) . 'Z';
}

function uuid4(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}
