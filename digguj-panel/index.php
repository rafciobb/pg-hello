<?php
/**
 * DIGGUJ FAKTY – panel twórcy.
 * Jedyny publiczny plik PHP: obsługuje strony panelu, API i serwowanie zdjęć.
 * Pliki statyczne (css/, js/, assets/, fonts/, vendor/) serwuje bezpośrednio serwer WWW.
 */
declare(strict_types=1);

namespace Digguj;

const APP_ROOT = __DIR__;

if (PHP_VERSION_ID < 80100) {
    http_response_code(500);
    exit('Panel wymaga PHP 8.1 lub nowszego (w OVH ustaw wersję w pliku .ovhconfig).');
}

require APP_ROOT . '/app/Core.php';
require APP_ROOT . '/app/Auth.php';
require APP_ROOT . '/app/Media.php';
require APP_ROOT . '/app/Posts.php';
require APP_ROOT . '/app/Installer.php';

ini_set('display_errors', '0');
Http::securityHeaders();

$path = Http::path();
$method = Http::method();
$isApi = str_starts_with($path, '/api/');

set_exception_handler(function (\Throwable $e) use ($isApi): void {
    if ($e instanceof HttpError) {
        $status = $e->status;
        $message = $e->getMessage();
        $extra = $e->extra;
    } else {
        error_log('[digguj] ' . $e);
        $status = 500;
        $message = 'Błąd serwera.';
        $extra = [];
    }
    if ($isApi) {
        Http::json(['error' => $message] + $extra, $status);
    }
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    echo $message;
});

/** Pierwsze konto z zmiennych środowiskowych – tylko do testów lokalnych w Dockerze. */
function bootstrapAdmin(): void
{
    $user = getenv('DIGGUJ_BOOTSTRAP_ADMIN_USER');
    $pass = getenv('DIGGUJ_BOOTSTRAP_ADMIN_PASSWORD');
    if (!$user || !$pass) {
        return;
    }
    if ((int) Db::one('SELECT COUNT(*) AS n FROM users')['n'] === 0) {
        Db::exec('INSERT INTO users (username, password_hash) VALUES (?, ?)', [$user, Auth::hash($pass)]);
    }
}

function page(string $file): never
{
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    readfile(APP_ROOT . '/pages/' . $file);
    exit;
}

function requirePage(): void
{
    if (!Auth::user()) {
        header('Location: /login?next=' . rawurlencode($_SERVER['REQUEST_URI'] ?? '/'), true, 302);
        exit;
    }
}

// ── Instalacja ─────────────────────────────────────────────────────────
if ($path === '/install') {
    Installer::handle();
}
if ($path === '/healthz') {
    Http::json(['ok' => true, 'installed' => Config::load() !== null]);
}
if (Config::load() === null) {
    if ($isApi) {
        throw new HttpError(503, 'Panel nie jest jeszcze zainstalowany – otwórz /install.');
    }
    header('Location: /install', true, 302);
    exit;
}

Migrator::run();
bootstrapAdmin();

// ── Strony ─────────────────────────────────────────────────────────────
if ($method === 'GET' || $method === 'HEAD') {
    switch ($path) {
        case '/':
        case '/index.php':
            requirePage();
            page('index.html');
        case '/editor':
            requirePage();
            page('editor.html');
        case '/login':
            if (Auth::user()) {
                header('Location: /', true, 302);
                exit;
            }
            page('login.html');
    }
    if (preg_match('#^/media/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$#', $path, $m)) {
        if (!Auth::user()) {
            http_response_code(401);
            exit;
        }
        Media::serve($m[1]);
    }
}

// ── API ────────────────────────────────────────────────────────────────
if ($isApi) {
    Http::csrfGuard();
    $route = $method . ' ' . substr($path, 4); // np. "GET /posts/12"

    if ($route === 'POST /auth/login') {
        Auth::login();
    }
    if ($route === 'POST /auth/logout') {
        Auth::logout();
    }
    $user = Auth::requireUser();

    if ($route === 'GET /auth/me') {
        Http::json(['user' => $user]);
    }
    if ($route === 'POST /auth/password') {
        Auth::changePassword();
    }
    if ($route === 'GET /posts') {
        Posts::list();
    }
    if ($route === 'POST /posts') {
        Posts::create($user);
    }
    if (preg_match('#^(GET|PUT|DELETE) /posts/(\d+)$#', $route, $m)) {
        $id = (int) $m[2];
        match ($m[1]) {
            'GET' => Posts::get($id),
            'PUT' => Posts::update($id, $user),
            'DELETE' => Posts::delete($id),
        };
    }
    if (preg_match('#^POST /posts/(\d+)/duplicate$#', $route, $m)) {
        Posts::duplicate((int) $m[1], $user);
    }
    if ($route === 'POST /media') {
        Media::upload($user);
    }
    if (preg_match('#^(GET|PUT) /settings/([A-Za-z]+)$#', $route, $m)) {
        $m[1] === 'GET' ? Settings::get($m[2]) : Settings::put($m[2], $user);
    }
    throw new HttpError(404, 'Nie znaleziono.');
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo '404 – nie znaleziono';
