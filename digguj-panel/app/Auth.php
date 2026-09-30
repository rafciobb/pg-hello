<?php
declare(strict_types=1);

namespace Digguj;

/** Sesje trzymane w bazie danych (niezależne od ustawień sesji na współdzielonym hostingu). */
final class DbSessionHandler implements \SessionHandlerInterface, \SessionUpdateTimestampHandlerInterface
{
    public function __construct(private int $lifetime)
    {
    }

    public function open(string $path, string $name): bool
    {
        return true;
    }

    public function close(): bool
    {
        return true;
    }

    public function read(string $id): string|false
    {
        $row = Db::one('SELECT data FROM sessions WHERE id = ? AND expires_at > ?', [$id, time()]);
        return $row ? (string) $row['data'] : '';
    }

    public function write(string $id, string $data): bool
    {
        if ($data === '') { // pusta sesja (np. niezalogowany gość) – nic nie zapisujemy
            Db::exec('DELETE FROM sessions WHERE id = ?', [$id]);
            return true;
        }
        $userId = isset($_SESSION['uid']) ? (int) $_SESSION['uid'] : null;
        Db::exec(
            'INSERT INTO sessions (id, user_id, data, expires_at) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), data = VALUES(data), expires_at = VALUES(expires_at)',
            [$id, $userId, $data, time() + $this->lifetime],
        );
        return true;
    }

    public function destroy(string $id): bool
    {
        Db::exec('DELETE FROM sessions WHERE id = ?', [$id]);
        return true;
    }

    public function gc(int $max_lifetime): int|false
    {
        return Db::exec('DELETE FROM sessions WHERE expires_at < ?', [time()]);
    }

    public function validateId(string $id): bool
    {
        return Db::one('SELECT 1 AS ok FROM sessions WHERE id = ? AND expires_at > ?', [$id, time()]) !== null;
    }

    public function updateTimestamp(string $id, string $data): bool
    {
        Db::exec('UPDATE sessions SET expires_at = ? WHERE id = ?', [time() + $this->lifetime, $id]);
        return true;
    }
}

final class Auth
{
    public const COOKIE = 'digguj_sid';
    private const MAX_FAILURES = 10;
    private const WINDOW = 15 * 60;
    // Hash "wydmuszka": gdy login nie istnieje, i tak sprawdzamy hasło – czas odpowiedzi nie zdradza, czy konto istnieje.
    private const DUMMY_HASH = '$2y$12$CQ3xj7uAQdfbS7sHWoo6MuY2JYRiEzlyJsjvuDeeiX7YcdMOrJKVy';

    private const HASH_OPTIONS = ['cost' => 12];

    private static ?array $user = null;
    private static bool $resolved = false;

    private static function lifetime(): int
    {
        return max(1, (int) Config::get()['session_days']) * 86400;
    }

    public static function startSession(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        $lifetime = self::lifetime();
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.use_trans_sid', '0');
        ini_set('session.gc_maxlifetime', (string) $lifetime);
        ini_set('session.gc_probability', '1');
        ini_set('session.gc_divisor', '100');
        session_name(self::COOKIE);
        session_set_cookie_params([
            'lifetime' => $lifetime,
            'path' => '/',
            'secure' => Http::isHttps(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_set_save_handler(new DbSessionHandler($lifetime), true);
        session_start();
    }

    /** Odświeża ważność ciasteczka (sesja "przesuwna" – wygasa po X dniach bezczynności). */
    private static function refreshCookie(): void
    {
        setcookie(self::COOKIE, session_id(), [
            'expires' => time() + self::lifetime(),
            'path' => '/',
            'secure' => Http::isHttps(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    /** Zalogowany użytkownik albo null. Sesję otwieramy tylko, gdy przeglądarka ma ciasteczko. */
    public static function user(): ?array
    {
        if (self::$resolved) {
            return self::$user;
        }
        self::$resolved = true;
        if (!isset($_COOKIE[self::COOKIE])) {
            return null;
        }
        self::startSession();
        if (empty($_SESSION['uid'])) {
            return null;
        }
        self::$user = Db::one('SELECT id, username, role FROM users WHERE id = ?', [(int) $_SESSION['uid']]);
        if (self::$user) {
            self::$user['id'] = (int) self::$user['id'];
            self::refreshCookie();
        }
        return self::$user;
    }

    public static function requireUser(): array
    {
        $u = self::user();
        if (!$u) {
            throw new HttpError(401, 'Nie jesteś zalogowany.');
        }
        return $u;
    }

    public static function validateNewPassword(mixed $password): ?string
    {
        if (!is_string($password) || mb_strlen($password) < 10) {
            return 'Hasło musi mieć co najmniej 10 znaków.';
        }
        if (strlen($password) > 200) {
            return 'Hasło jest za długie.';
        }
        return null;
    }

    public static function hash(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, self::HASH_OPTIONS);
    }

    /** Limit nieudanych prób z jednego IP. */
    public static function assertNotRateLimited(): void
    {
        if (random_int(1, 50) === 1) {
            Db::exec('DELETE FROM login_attempts WHERE created_at < ?', [time() - 86400]);
        }
        $row = Db::one('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND created_at > ?', [Http::clientIp(), time() - self::WINDOW]);
        if ((int) $row['n'] >= self::MAX_FAILURES) {
            throw new HttpError(429, 'Za dużo nieudanych prób. Spróbuj ponownie za kilkanaście minut.');
        }
    }

    public static function recordFailure(): void
    {
        Db::exec('INSERT INTO login_attempts (ip, created_at) VALUES (?, ?)', [Http::clientIp(), time()]);
    }

    public static function login(): never
    {
        self::assertNotRateLimited();
        $b = Http::body();
        $username = $b['username'] ?? null;
        $password = $b['password'] ?? null;
        if (!is_string($username) || !is_string($password) || trim($username) === '' || $password === ''
            || mb_strlen($username) > 100 || strlen($password) > 200) {
            throw new HttpError(400, 'Podaj login i hasło.');
        }
        $user = Db::one('SELECT id, username, role, password_hash FROM users WHERE username = ?', [trim($username)]);
        $ok = password_verify($password, $user['password_hash'] ?? self::DUMMY_HASH);
        if (!$user || !$ok) {
            self::recordFailure();
            throw new HttpError(401, 'Nieprawidłowy login lub hasło.');
        }
        if (password_needs_rehash($user['password_hash'], PASSWORD_BCRYPT, self::HASH_OPTIONS)) {
            Db::exec('UPDATE users SET password_hash = ? WHERE id = ?', [self::hash($password), $user['id']]);
        }
        self::startSession();
        session_regenerate_id(true); // nowe ID sesji po zalogowaniu (ochrona przed session fixation)
        $_SESSION['uid'] = (int) $user['id'];
        Db::exec('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [$user['id']]);
        Db::exec('DELETE FROM login_attempts WHERE ip = ?', [Http::clientIp()]);
        Http::json(['user' => ['id' => (int) $user['id'], 'username' => $user['username'], 'role' => $user['role']]]);
    }

    public static function logout(): never
    {
        if (isset($_COOKIE[self::COOKIE])) {
            self::startSession();
            $_SESSION = [];
            session_destroy();
        }
        setcookie(self::COOKIE, '', ['expires' => time() - 3600, 'path' => '/', 'secure' => Http::isHttps(), 'httponly' => true, 'samesite' => 'Lax']);
        Http::json(['ok' => true]);
    }

    public static function changePassword(): never
    {
        $user = self::requireUser();
        self::assertNotRateLimited();
        $b = Http::body();
        if ($problem = self::validateNewPassword($b['newPassword'] ?? null)) {
            throw new HttpError(400, $problem);
        }
        if (!is_string($b['currentPassword'] ?? null)) {
            throw new HttpError(400, 'Podaj obecne hasło.');
        }
        $row = Db::one('SELECT password_hash FROM users WHERE id = ?', [$user['id']]);
        if (!$row || !password_verify($b['currentPassword'], $row['password_hash'])) {
            self::recordFailure();
            throw new HttpError(401, 'Obecne hasło jest nieprawidłowe.');
        }
        Db::exec('UPDATE users SET password_hash = ? WHERE id = ?', [self::hash($b['newPassword']), $user['id']]);
        // Wylogowujemy pozostałe urządzenia
        Db::exec('DELETE FROM sessions WHERE user_id = ? AND id <> ?', [$user['id'], session_id()]);
        Http::json(['ok' => true]);
    }
}
