<?php
/**
 * DobbhyPay — Songs Catalog API (PHP / XAMPP)
 * 
 * Location:
 *   http://localhost:40/dobbhypay/backend/api/songs.php
 * 
 * Parameters (GET):
 *   ?search=ar+rahman
 *   ?language=tamil | telugu | hindi | malayalam | english | all
 *   ?director=Anirudh
 *   ?decade=2020s | 2010s | 2000s | 1990s
 *   ?page=1&limit=50
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

$db = getDbConnection();

$page     = max(1, (int)($_GET['page'] ?? 1));
$limit    = max(1, min(100, (int)($_GET['limit'] ?? 50)));
$offset   = ($page - 1) * $limit;

$search   = trim($_GET['search'] ?? $_GET['q'] ?? '');
$language = trim($_GET['language'] ?? $_GET['lang'] ?? '');
$director = trim($_GET['director'] ?? '');
$decade   = trim($_GET['decade'] ?? '');
$category = trim($_GET['category'] ?? '');

$where = ["1=1"];
$params = [];

if ($language && $language !== 'all') {
    $where[] = "language_id = :lang";
    $params[':lang'] = strtolower($language);
}

if ($decade && $decade !== 'all') {
    $where[] = "decade = :decade";
    $params[':decade'] = $decade;
}

if ($category && $category !== 'all') {
    $where[] = "category = :category";
    $params[':category'] = $category;
}

if ($director) {
    $where[] = "director_name LIKE :director";
    $params[':director'] = "%$director%";
}

if ($search) {
    $where[] = "(title LIKE :s OR artist LIKE :s OR album LIKE :s OR director_name LIKE :s)";
    $params[':s'] = "%$search%";
}

$whereClause = implode(" AND ", $where);

// Total Count
$countStmt = $db->prepare("SELECT COUNT(*) as total FROM songs WHERE $whereClause");
$countStmt->execute($params);
$totalSongs = (int)$countStmt->fetchColumn();
$totalPages = ceil($totalSongs / $limit) ?: 1;

// Paginated Query
$sql = "SELECT id, title, artist, director_name as director, album, duration, duration_sec as durationSec,
               audio_url as audioUrl, cover_url as coverUrl, genre, release_year as releaseYear,
               decade, language_id as language, category, plays, color,
               COALESCE(provider, 'local') as provider,
               COALESCE(is_preview, 0) as isPreview,
               COALESCE(playback_type, 'full') as playbackType,
               COALESCE(license_note, 'Authorized Stream') as licenseNote,
               source_id as sourceId
          FROM songs
         WHERE $whereClause
         ORDER BY release_year DESC, id ASC
         LIMIT :limit OFFSET :offset";

$stmt = $db->prepare($sql);
foreach ($params as $k => $v) {
    $stmt->bindValue($k, $v);
}
$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();
$songs = $stmt->fetchAll();

echo json_encode([
    'success'    => true,
    'songs'      => $songs,
    'pagination' => [
        'currentPage' => $page,
        'totalPages'  => $totalPages,
        'totalSongs'  => $totalSongs,
        'limit'       => $limit,
        'hasNextPage' => $page < $totalPages,
        'hasPrevPage' => $page > 1
    ]
]);
