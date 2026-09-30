<?php
declare(strict_types=1);

namespace Digguj;

/**
 * Strona /install:
 *  - pierwsza instalacja: dane bazy MySQL z panelu OVH + pierwsze konto → zapisuje config.php,
 *  - później (z kluczem z config.php): zmiana zapomnianego hasła albo dodanie kolejnego konta.
 */
final class Installer
{
    private static function h(?string $s): string
    {
        return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
    }

    private static function page(string $title, string $body): never
    {
        http_response_code(200);
        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: no-store');
        echo '<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'
            . '<meta name="robots" content="noindex, nofollow"><title>' . self::h($title) . ' • DIGGUJ FAKTY</title>'
            . '<link rel="stylesheet" href="/css/base.css"><style>'
            . 'body{display:flex;justify-content:center;padding:40px 16px}main{width:100%;max-width:560px;display:flex;flex-direction:column;gap:18px}'
            . 'h1{font-family:Montserrat,sans-serif;font-weight:900;color:var(--accent);font-size:26px}h2{font-family:Montserrat,sans-serif;font-size:15px;letter-spacing:1px;color:var(--muted);margin-bottom:4px}'
            . 'form{display:flex;flex-direction:column;gap:12px}p,li{font-size:13px;line-height:1.5;color:#ccc}code{font-family:"Space Mono",monospace;color:var(--accent);word-break:break-all}'
            . '.ok{border-left:3px solid var(--ok)}.err{border-left:3px solid var(--danger);color:#ffb3b3}.btn{padding:14px}'
            . '</style></head><body><main><h1>DIGGUJ FAKTY</h1>' . $body . '</main></body></html>';
        exit;
    }

    private static function field(string $name, string $label, string $type = 'text', string $value = '', string $extra = ''): string
    {
        return '<div><label for="' . $name . '">' . self::h($label) . '</label><input type="' . $type . '" id="' . $name
            . '" name="' . $name . '" value="' . self::h($value) . '" ' . $extra . '></div>';
    }

    private static function post(string $key): string
    {
        return trim((string) ($_POST[$key] ?? ''));
    }

    private static function validateLogin(string $login): ?string
    {
        return preg_match('/^[A-Za-z0-9._-]{3,50}$/', $login) ? null : 'Login: 3–50 znaków (litery, cyfry, . _ -).';
    }

    public static function handle(): never
    {
        $config = Config::load();
        $error = '';

        if ($config === null) {
            if (Http::method() === 'POST') {
                $error = self::install();
            }
            self::installForm($error);
        }

        // Panel skonfigurowany
        Migrator::run();
        $hasUsers = (int) Db::one('SELECT COUNT(*) AS n FROM users')['n'] > 0;
        $message = '';
        if (Http::method() === 'POST') {
            [$error, $message] = self::recover($config);
        }
        self::recoveryForm($hasUsers, $error, $message);
    }

    // ── Pierwsza instalacja ────────────────────────────────────────────────
    private static function installForm(string $error): never
    {
        $hostHint = 'np. xxxxxx.mysql.db (z panelu OVH)';
        $body = '<div class="card"><h2>INSTALACJA</h2><p>Podaj dane bazy MySQL z panelu OVH: <b>Web Cloud → Hosting → Bazy danych</b> '
            . '(serwer, nazwa bazy, użytkownik i hasło) oraz załóż swoje konto do logowania.</p></div>'
            . ($error ? '<div class="card err">' . self::h($error) . '</div>' : '')
            . '<form method="post" class="card" autocomplete="off">'
            . '<h2>BAZA DANYCH</h2>'
            . self::field('db_host', 'Serwer bazy (' . $hostHint . ')', 'text', self::post('db_host'), 'required')
            . self::field('db_port', 'Port', 'number', self::post('db_port') ?: '3306', 'required')
            . self::field('db_name', 'Nazwa bazy', 'text', self::post('db_name'), 'required')
            . self::field('db_user', 'Użytkownik bazy', 'text', self::post('db_user'), 'required')
            . self::field('db_pass', 'Hasło do bazy', 'password', '', 'required')
            . '<h2 style="margin-top:10px">TWOJE KONTO</h2>'
            . self::field('login', 'Login', 'text', self::post('login'), 'required autocomplete="username"')
            . self::field('password', 'Hasło (min. 10 znaków)', 'password', '', 'required minlength="10" autocomplete="new-password"')
            . self::field('password2', 'Powtórz hasło', 'password', '', 'required minlength="10" autocomplete="new-password"')
            . '<button class="btn btn-primary" type="submit">ZAINSTALUJ</button></form>';
        self::page('Instalacja', $body);
    }

    private static function install(): string
    {
        $db = [
            'host' => self::post('db_host'), 'port' => (int) (self::post('db_port') ?: 3306),
            'name' => self::post('db_name'), 'user' => self::post('db_user'), 'pass' => (string) ($_POST['db_pass'] ?? ''),
        ];
        $login = self::post('login');
        $password = (string) ($_POST['password'] ?? '');
        if (in_array('', [$db['host'], $db['name'], $db['user']], true)) {
            return 'Uzupełnij dane bazy danych.';
        }
        if ($e = self::validateLogin($login)) {
            return $e;
        }
        if ($e = Auth::validateNewPassword($password)) {
            return $e;
        }
        if ($password !== ($_POST['password2'] ?? '')) {
            return 'Hasła się różnią.';
        }
        try {
            Db::use(Db::connect($db));
        } catch (\PDOException $e) {
            return 'Nie udało się połączyć z bazą danych. Sprawdź serwer, nazwę bazy, użytkownika i hasło. (' . $e->getMessage() . ')';
        }
        Migrator::run();

        $users = Db::all('SELECT id, password_hash FROM users WHERE username = ?', [$login]);
        $count = (int) Db::one('SELECT COUNT(*) AS n FROM users')['n'];
        if ($count > 0) {
            // Baza ma już konta (np. przeprowadzka na nowy serwer) – wymagamy hasła istniejącego konta
            if (!$users || !password_verify($password, $users[0]['password_hash'])) {
                return 'Ta baza zawiera już konta. Podaj login i hasło istniejącego konta, aby podłączyć ją ponownie.';
            }
        } else {
            Db::exec('INSERT INTO users (username, password_hash) VALUES (?, ?)', [$login, Auth::hash($password)]);
        }

        $setupKey = bin2hex(random_bytes(16));
        $php = "<?php\n// Konfiguracja panelu DIGGUJ FAKTY – plik wygenerowany przez /install.\n"
            . "// Nie udostępniaj go nikomu. \"setup_key\" jest potrzebny do odzyskania hasła na stronie /install.\n"
            . 'return ' . var_export([
                'db' => $db,
                'setup_key' => $setupKey,
                'max_upload_mb' => 25,
                'session_days' => 14,
            ], true) . ";\n";

        if (@file_put_contents(Config::file(), $php, LOCK_EX) === false) {
            $body = '<div class="card err"><p>Nie udało się zapisać pliku <code>config.php</code> (brak uprawnień).</p>'
                . '<p>Utwórz go ręcznie przez FTP w głównym katalogu panelu z poniższą zawartością:</p></div>'
                . '<textarea class="card" readonly style="min-height:280px;font-family:monospace">' . self::h($php) . '</textarea>';
            self::page('Instalacja', $body);
        }
        @chmod(Config::file(), 0600);

        $body = '<div class="card ok"><h2>GOTOWE ✓</h2><p>Panel jest zainstalowany, a Twoje konto <b>' . self::h($login) . '</b> utworzone.</p>'
            . '<p>Zapisz w bezpiecznym miejscu <b>klucz odzyskiwania</b> (jest też w pliku <code>config.php</code> na serwerze) – '
            . 'przyda się, gdy zapomnisz hasła:</p><p><code>' . self::h($setupKey) . '</code></p></div>'
            . '<a class="btn btn-primary" href="/login">PRZEJDŹ DO LOGOWANIA →</a>';
        self::page('Gotowe', $body);
    }

    // ── Odzyskiwanie hasła / dodawanie kont ──────────────────────────────
    private static function recoveryForm(bool $hasUsers, string $error, string $message): never
    {
        $intro = $hasUsers
            ? '<div class="card"><h2>PANEL JEST ZAINSTALOWANY</h2><p><a href="/login" style="color:var(--accent)">Przejdź do logowania →</a></p>'
                . '<p>Poniżej możesz <b>zmienić zapomniane hasło</b> albo <b>dodać kolejne konto</b>. Potrzebny jest klucz odzyskiwania '
                . '(<code>setup_key</code> z pliku <code>config.php</code> na serwerze – podejrzysz go przez FTP).</p></div>'
            : '<div class="card"><h2>ZAŁÓŻ PIERWSZE KONTO</h2><p>Baza jest skonfigurowana, ale nie ma jeszcze żadnego konta. '
                . 'Podaj klucz <code>setup_key</code> z pliku <code>config.php</code>.</p></div>';
        $body = $intro
            . ($error ? '<div class="card err">' . self::h($error) . '</div>' : '')
            . ($message ? '<div class="card ok">' . $message . '</div>' : '')
            . '<form method="post" class="card" autocomplete="off">'
            . self::field('setup_key', 'Klucz odzyskiwania (setup_key)', 'password', '', 'required')
            . self::field('login', 'Login (istniejący – zmiana hasła; nowy – nowe konto)', 'text', self::post('login'), 'required')
            . self::field('password', 'Nowe hasło (min. 10 znaków)', 'password', '', 'required minlength="10" autocomplete="new-password"')
            . self::field('password2', 'Powtórz hasło', 'password', '', 'required minlength="10" autocomplete="new-password"')
            . '<button class="btn btn-primary" type="submit">ZAPISZ</button></form>';
        self::page('Konta', $body);
    }

    /** @return array{0: string, 1: string} [błąd, komunikat] */
    private static function recover(array $config): array
    {
        try {
            Auth::assertNotRateLimited();
        } catch (HttpError $e) {
            return [$e->getMessage(), ''];
        }
        $key = (string) ($config['setup_key'] ?? '');
        if (strlen($key) < 16) {
            return ['W konfiguracji brak klucza setup_key (min. 16 znaków) – dopisz go w config.php.', ''];
        }
        if (!hash_equals($key, (string) ($_POST['setup_key'] ?? ''))) {
            Auth::recordFailure();
            return ['Nieprawidłowy klucz odzyskiwania.', ''];
        }
        $login = self::post('login');
        $password = (string) ($_POST['password'] ?? '');
        if ($e = self::validateLogin($login)) {
            return [$e, ''];
        }
        if ($e = Auth::validateNewPassword($password)) {
            return [$e, ''];
        }
        if ($password !== ($_POST['password2'] ?? '')) {
            return ['Hasła się różnią.', ''];
        }
        $user = Db::one('SELECT id FROM users WHERE username = ?', [$login]);
        if ($user) {
            Db::exec('UPDATE users SET password_hash = ? WHERE id = ?', [Auth::hash($password), $user['id']]);
            Db::exec('DELETE FROM sessions WHERE user_id = ?', [$user['id']]);
            return ['', 'Zmieniono hasło konta <b>' . self::h($login) . '</b>. <a href="/login" style="color:var(--accent)">Zaloguj się →</a>'];
        }
        Db::exec('INSERT INTO users (username, password_hash) VALUES (?, ?)', [$login, Auth::hash($password)]);
        return ['', 'Utworzono konto <b>' . self::h($login) . '</b>. <a href="/login" style="color:var(--accent)">Zaloguj się →</a>'];
    }
}
