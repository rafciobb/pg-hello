<?php
declare(strict_types=1);

namespace Digguj;

final class Posts
{
    public const MODES = ['album', 'general', 'calendar'];
    public const FORMATS = ['carousel', 'reel', 'video'];
    public const STATUSES = ['draft', 'ready', 'scheduled', 'published'];

    private const SORTS = [
        'updated' => 'p.updated_at DESC, p.id DESC',
        'created' => 'p.created_at DESC, p.id DESC',
        'scheduled' => 'p.scheduled_at IS NULL, p.scheduled_at ASC, p.updated_at DESC',
    ];

    private const MAX_THUMB_BYTES = 1024 * 1024;

    private const SELECT = 'SELECT p.*, cu.username AS created_by_name, uu.username AS updated_by_name
        FROM posts p
        LEFT JOIN users cu ON cu.id = p.created_by
        LEFT JOIN users uu ON uu.id = p.updated_by';

    /** Kolumna w bazie dla pól, które można zmieniać */
    private const COLUMNS = [
        'title' => 'title', 'mode' => 'mode', 'format' => 'format', 'status' => 'status',
        'scheduledAt' => 'scheduled_at', 'caption' => 'caption', 'data' => 'data',
    ];

    private static function serialize(array $r, bool $full = false): array
    {
        $post = [
            'id' => (int) $r['id'],
            'title' => $r['title'],
            'mode' => $r['mode'],
            'format' => $r['format'],
            'status' => $r['status'],
            'scheduledAt' => iso($r['scheduled_at']),
            'publishedAt' => iso($r['published_at']),
            'caption' => $r['caption'],
            'thumbUrl' => Media::url($r['thumb_media_id']),
            'version' => (int) $r['version'],
            'createdAt' => iso($r['created_at']),
            'updatedAt' => iso($r['updated_at']),
            'createdBy' => $r['created_by_name'] ?? null,
            'updatedBy' => $r['updated_by_name'] ?? null,
        ];
        if ($full) {
            $data = json_decode($r['data'], false);
            $post['data'] = is_object($data) ? $data : new \stdClass();
        }
        return $post;
    }

    private static function find(int $id): ?array
    {
        return Db::one(self::SELECT . ' WHERE p.id = ?', [$id]);
    }

    /** Waliduje dane z edytora. Zwraca tylko pola, które przyszły w żądaniu. */
    private static function parseInput(array $b): array
    {
        $out = [];
        if (array_key_exists('title', $b)) {
            if (!is_string($b['title']) || mb_strlen($b['title']) > 200) {
                throw new HttpError(400, 'Tytuł: maks. 200 znaków.');
            }
            $out['title'] = trim($b['title']);
        }
        foreach (['mode' => self::MODES, 'format' => self::FORMATS, 'status' => self::STATUSES] as $key => $allowed) {
            if (array_key_exists($key, $b)) {
                if (!in_array($b[$key], $allowed, true)) {
                    throw new HttpError(400, "Nieprawidłowa wartość pola {$key}.");
                }
                $out[$key] = $b[$key];
            }
        }
        if (array_key_exists('scheduledAt', $b)) {
            if ($b['scheduledAt'] === null || $b['scheduledAt'] === '') {
                $out['scheduledAt'] = null;
            } else {
                try {
                    $d = new \DateTimeImmutable((string) $b['scheduledAt']);
                } catch (\Exception) {
                    throw new HttpError(400, 'Nieprawidłowa data publikacji.');
                }
                $out['scheduledAt'] = $d->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d H:i:s');
            }
        }
        if (array_key_exists('caption', $b)) {
            if (!is_string($b['caption']) || mb_strlen($b['caption']) > 10000) {
                throw new HttpError(400, 'Opis: maks. 10 000 znaków.');
            }
            $out['caption'] = $b['caption'];
        }
        if (array_key_exists('data', $b)) {
            if (!is_array($b['data']) || ($b['data'] !== [] && array_is_list($b['data']))) {
                throw new HttpError(400, 'Nieprawidłowe dane edytora.');
            }
            // Zapisujemy dokładnie to, co przysłał edytor (z zachowaniem pustych obiektów {})
            $data = Http::bodyObject()->data ?? null;
            $out['data'] = json_encode(is_object($data) ? $data : (object) $b['data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if (strlen($out['data']) > 4 * 1024 * 1024) {
                throw new HttpError(413, 'Za duże dane posta.');
            }
        }
        if (array_key_exists('thumbnail', $b) && $b['thumbnail'] !== null) {
            if (!is_string($b['thumbnail']) || !preg_match('#^data:image/jpeg;base64,([A-Za-z0-9+/=]+)$#', $b['thumbnail'], $m)) {
                throw new HttpError(400, 'Nieprawidłowa miniatura.');
            }
            $bytes = base64_decode($m[1], true);
            if ($bytes === false || strlen($bytes) > self::MAX_THUMB_BYTES) {
                throw new HttpError(400, 'Nieprawidłowa lub za duża miniatura.');
            }
            $out['thumbnail'] = $bytes;
        }
        return $out;
    }

    private static function replaceThumbnail(int $postId, string $bytes, int $userId): void
    {
        $newId = Media::store($bytes, 'thumbnail', null, $userId);
        $old = Db::one('SELECT thumb_media_id FROM posts WHERE id = ?', [$postId]);
        Db::exec('UPDATE posts SET thumb_media_id = ? WHERE id = ?', [$newId, $postId]);
        Media::delete($old['thumb_media_id'] ?? null);
    }

    public static function list(): never
    {
        $where = [];
        $params = [];
        $status = $_GET['status'] ?? '';
        $mode = $_GET['mode'] ?? '';
        $q = trim((string) ($_GET['q'] ?? ''));
        if (in_array($status, self::STATUSES, true)) {
            $where[] = 'p.status = ?';
            $params[] = $status;
        }
        if (in_array($mode, self::MODES, true)) {
            $where[] = 'p.mode = ?';
            $params[] = $mode;
        }
        if ($q !== '') {
            $like = '%' . addcslashes($q, '\\%_') . '%';
            $where[] = '(p.title LIKE ? OR p.caption LIKE ?)';
            array_push($params, $like, $like);
        }
        $order = self::SORTS[$_GET['sort'] ?? ''] ?? self::SORTS['updated'];
        $sql = self::SELECT . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . " ORDER BY {$order} LIMIT 500";
        Http::json(['posts' => array_map(fn ($r) => self::serialize($r), Db::all($sql, $params))]);
    }

    public static function get(int $id): never
    {
        $row = self::find($id) ?? throw new HttpError(404, 'Nie znaleziono posta.');
        Http::json(['post' => self::serialize($row, true)]);
    }

    public static function create(array $user): never
    {
        $body = Http::body();
        $input = self::parseInput(['mode' => 'album', 'format' => 'carousel', 'data' => [], ...$body]);
        if ($input['mode'] === 'calendar' && !array_key_exists('format', $body)) {
            $input['format'] = 'reel'; // kalendarium jest zawsze pionowe
        }
        Db::exec(
            'INSERT INTO posts (title, mode, format, status, scheduled_at, caption, data, created_by, updated_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
            [$input['title'] ?? '', $input['mode'], $input['format'], $input['status'] ?? 'draft', $input['scheduledAt'] ?? null,
                $input['caption'] ?? '', $input['data'], $user['id'], $user['id']],
        );
        $id = Db::lastId();
        if (isset($input['thumbnail'])) {
            self::replaceThumbnail($id, $input['thumbnail'], $user['id']);
        }
        Http::json(['post' => self::serialize(self::find($id), true)], 201);
    }

    /**
     * Zapis z edytora (pełny) albo częściowy (np. zmiana statusu z listy).
     * Wymaga `version` – jeśli ktoś w międzyczasie zapisał post (inna karta/urządzenie), zwracamy 409.
     */
    public static function update(int $id, array $user): never
    {
        $body = Http::body();
        $version = $body['version'] ?? null;
        if (!is_int($version)) {
            throw new HttpError(400, 'Brak wersji posta.');
        }
        $input = self::parseInput($body);
        $sets = [];
        $params = [];
        foreach (self::COLUMNS as $key => $col) {
            if (!array_key_exists($key, $input)) {
                continue;
            }
            $sets[] = "{$col} = ?";
            $params[] = $input[$key];
            if ($key === 'status') {
                $sets[] = "published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, UTC_TIMESTAMP()) ELSE NULL END";
                $params[] = $input[$key];
            }
        }
        $sets[] = 'version = version + 1';
        $sets[] = 'updated_at = UTC_TIMESTAMP()';
        $sets[] = 'updated_by = ?';
        array_push($params, $user['id'], $id, $version);
        $changed = Db::exec('UPDATE posts SET ' . implode(', ', $sets) . ' WHERE id = ? AND version = ?', $params);
        if ($changed === 0) {
            $current = Db::one('SELECT version FROM posts WHERE id = ?', [$id]);
            if (!$current) {
                throw new HttpError(404, 'Nie znaleziono posta.');
            }
            throw new HttpError(409, 'Post został w międzyczasie zmieniony w innym miejscu.', ['currentVersion' => (int) $current['version']]);
        }
        if (isset($input['thumbnail'])) {
            self::replaceThumbnail($id, $input['thumbnail'], $user['id']);
        }
        Http::json(['post' => self::serialize(self::find($id), ($_GET['full'] ?? '') === '1')]);
    }

    public static function duplicate(int $id, array $user): never
    {
        $src = Db::one('SELECT * FROM posts WHERE id = ?', [$id]) ?? throw new HttpError(404, 'Nie znaleziono posta.');
        $thumb = $src['thumb_media_id'] ? Media::copy($src['thumb_media_id'], $user['id']) : null;
        $data = json_decode($src['data'], false);
        if (!is_object($data)) {
            $data = new \stdClass();
        }
        if (!empty($data->customTitle) && is_string($data->customTitle)) {
            $data->customTitle .= ' (kopia)';
        }
        Db::exec(
            "INSERT INTO posts (title, mode, format, status, caption, data, thumb_media_id, created_by, updated_by, created_at, updated_at)
             VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())",
            [mb_substr($src['title'] . ' (kopia)', 0, 200), $src['mode'], $src['format'], $src['caption'],
                json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $thumb, $user['id'], $user['id']],
        );
        Http::json(['post' => self::serialize(self::find(Db::lastId()))], 201);
    }

    public static function delete(int $id): never
    {
        $row = Db::one('SELECT thumb_media_id FROM posts WHERE id = ?', [$id]) ?? throw new HttpError(404, 'Nie znaleziono posta.');
        Db::exec('DELETE FROM posts WHERE id = ?', [$id]);
        // Miniaturę usuwamy od razu; zdjęć slajdów nie (mogą być współdzielone z kopiami posta).
        Media::delete($row['thumb_media_id']);
        Http::json(['ok' => true]);
    }
}
