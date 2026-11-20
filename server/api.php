<?php
/**
 * DobbyPay Music API — Localhost Dedicated Standalone Endpoint
 * Environment: Localhost (Apache / XAMPP port 40 & Node dev port 3000)
 * Database: dobbyppay on 127.0.0.1:3310 (fallback: 3306)
 */

error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ─── Localhost MySQL Database Connection (Fast, Zero Network Delay) ──────────
$db_host = '127.0.0.1';
$db_user = 'root';
$db_pass = '';
$db_name = 'dobbyppay';
$db_port = 3310;

// Connect to 3310 first (XAMPP configured port), then 3306 fallback
$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name, 3310);
if ($conn->connect_error) {
    $conn = @new mysqli($db_host, $db_user, $db_pass, $db_name, 3306);
    if (!$conn->connect_error) {
        $db_port = 3306;
    }
}

if ($conn && !$conn->connect_error) {
    $conn->set_charset("utf8mb4");
}

$action = $_GET['action'] ?? null;
if (!$action) {
    $rawInput = file_get_contents('php://input');
    $jsonData = json_decode($rawInput, true);
    if (is_array($jsonData) && !empty($jsonData['action'])) {
        $action = $jsonData['action'];
    }
}

// ─── Health / Ping Endpoint ──────────────────────────────────────────────────
if (!$action || $action === 'ping' || isset($_GET['i'])) {
    $isDbConnected = ($conn && !$conn->connect_error);
    $songCount = 0;
    $userCount = 0;
    if ($isDbConnected) {
        $sc = $conn->query("SELECT COUNT(*) as cnt FROM songs");
        if ($sc) $songCount = (int)$sc->fetch_assoc()['cnt'];
        $uc = $conn->query("SELECT COUNT(*) as cnt FROM users");
        if ($uc) $userCount = (int)$uc->fetch_assoc()['cnt'];
    }

    echo json_encode([
        'status' => true,
        'success' => true,
        'message' => 'DobbyPay Localhost Music API (api.php) is active and running!',
        'server' => $_SERVER['HTTP_HOST'] ?? 'localhost:40',
        'environment' => 'localhost',
        'database' => $isDbConnected ? "Connected to {$db_name} on {$db_host}:{$db_port}" : "Database Connection Failed",
        'stats' => [
            'songs' => $songCount,
            'users' => $userCount
        ],
        'endpoints' => [
            'songs' => 'GET ?action=songs&search={query}&limit=50',
            'directors' => 'GET ?action=directors',
            'login' => 'POST ?action=login',
            'register' => 'POST ?action=register',
            'admin_users' => 'GET ?action=admin_users',
            'approve_user' => 'POST ?action=approve_user',
            'test_db' => 'GET ?action=test_db'
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

if (!$conn || $conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'status' => false,
        'success' => false,
        'error' => 'Database connection unavailable: ' . ($conn ? $conn->connect_error : 'Could not initialize MySQLi on port 3310/3306')
    ]);
    exit;
}

// Ensure required tables exist
@$conn->query("CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'client',
    avatar TEXT,
    phone VARCHAR(32) DEFAULT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    email_verified TINYINT(1) NOT NULL DEFAULT 1,
    admin_approved TINYINT(1) NOT NULL DEFAULT 0,
    superadmin_approved TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

@$conn->query("CREATE TABLE IF NOT EXISTS upi_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bank_name VARCHAR(128) NOT NULL DEFAULT 'DobbyPay Digital Bank',
    account_number VARCHAR(64) NOT NULL,
    ifsc_code VARCHAR(32) NOT NULL DEFAULT 'DOBBY001',
    account_holder VARCHAR(128) NOT NULL,
    upi_id VARCHAR(128) NOT NULL UNIQUE,
    balance DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    is_primary TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

@$conn->query("CREATE TABLE IF NOT EXISTS upi_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_upi_id VARCHAR(128) NOT NULL,
    receiver_upi_id VARCHAR(128) NOT NULL,
    sender_name VARCHAR(128) NOT NULL,
    receiver_name VARCHAR(128) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    txn_ref VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

// ─── GET ?action=test_db ─────────────────────────────────────────────────────
if ($action === 'test_db') {
    $tables = [];
    $res = $conn->query("SHOW TABLES");
    if ($res) {
        while ($row = $res->fetch_array()) {
            $tables[] = $row[0];
        }
    }

    $usersSample = [];
    $userCount = 0;
    if (in_array('users', $tables)) {
        $uRes = $conn->query("SELECT id, name, email, role, status, admin_approved, superadmin_approved, phone, created_at FROM users ORDER BY id DESC LIMIT 10");
        if ($uRes) {
            while ($u = $uRes->fetch_assoc()) {
                $usersSample[] = $u;
            }
        }
        $cRes = $conn->query("SELECT COUNT(*) as cnt FROM users");
        if ($cRes) {
            $userCount = (int)$cRes->fetch_assoc()['cnt'];
        }
    }

    $songsCount = 0;
    if (in_array('songs', $tables)) {
        $scRes = $conn->query("SELECT COUNT(*) as cnt FROM songs");
        if ($scRes) {
            $songsCount = (int)$scRes->fetch_assoc()['cnt'];
        }
    }

    echo json_encode([
        'status' => true,
        'success' => true,
        'environment' => 'localhost',
        'host' => $db_host,
        'port' => $db_port,
        'database' => $db_name,
        'userCount' => $userCount,
        'songsCount' => $songsCount,
        'tables' => $tables,
        'recent_users' => $usersSample
    ]);
    exit;
}

// ─── GET ?action=songs ───────────────────────────────────────────────────────
if ($action === 'songs') {
    $q = trim($_GET['search'] ?? $_GET['q'] ?? '');
    $director = trim($_GET['director'] ?? '');
    $lang = trim($_GET['language'] ?? $_GET['lang'] ?? '');
    $decade = trim($_GET['decade'] ?? '');
    $category = trim($_GET['category'] ?? '');
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    if ($limit <= 0 || $limit > 1000) $limit = 50;
    $offset = ($page - 1) * $limit;

    $where = ["1=1"];

    if (!empty($q)) {
        $safeQ = $conn->real_escape_string($q);
        $where[] = "(title LIKE '%{$safeQ}%' OR artist LIKE '%{$safeQ}%' OR album LIKE '%{$safeQ}%' OR director_name LIKE '%{$safeQ}%')";
    }
    if (!empty($director)) {
        $safeDir = $conn->real_escape_string($director);
        $where[] = "director_name LIKE '%{$safeDir}%'";
    }
    if (!empty($lang) && $lang !== 'all') {
        $safeLang = $conn->real_escape_string(strtolower($lang));
        $where[] = "language_id = '{$safeLang}'";
    }
    if (!empty($decade) && $decade !== 'all') {
        $safeDecade = $conn->real_escape_string($decade);
        $where[] = "decade = '{$safeDecade}'";
    }
    if (!empty($category) && $category !== 'all') {
        $safeCat = $conn->real_escape_string($category);
        $where[] = "category = '{$safeCat}'";
    }

    $whereClause = implode(" AND ", $where);

    // Get total count
    $totalSongs = 0;
    $countRes = $conn->query("SELECT COUNT(*) as total FROM songs WHERE {$whereClause}");
    if ($countRes) {
        $totalSongs = (int)$countRes->fetch_assoc()['total'];
    }
    $totalPages = ceil($totalSongs / $limit) ?: 1;

    // Fetch songs
    $sql = "SELECT id, title, artist, director_name, director_name as director, album, duration, duration_sec,
                   audio_url, cover_url, genre, release_year, decade, language_id, category, plays, color,
                   provider, is_preview, playback_type, license_note, source_id
              FROM songs
             WHERE {$whereClause}
             ORDER BY release_year DESC, id ASC
             LIMIT {$limit} OFFSET {$offset}";

    $songs = [];
    $res = $conn->query($sql);
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $songs[] = [
                'id' => $row['id'],
                'title' => $row['title'],
                'artist' => $row['artist'],
                'director' => $row['director_name'] ?: ($row['director'] ?: 'Music Director'),
                'album' => $row['album'] ?: 'Single',
                'duration' => $row['duration'] ?: '3:30',
                'durationSec' => (int)($row['duration_sec'] ?: 210),
                'audioUrl' => $row['audio_url'],
                'coverUrl' => $row['cover_url'],
                'genre' => $row['genre'] ?: 'Indian Music',
                'releaseYear' => (int)($row['release_year'] ?: 2024),
                'decade' => $row['decade'] ?: '2020s',
                'language' => $row['language_id'] ?: 'tamil',
                'category' => $row['category'] ?: 'songs',
                'plays' => $row['plays'] ?: '100,000',
                'color' => $row['color'] ?: '#FF6B00',
                'provider' => $row['provider'] ?: 'local',
                'isPreview' => (int)($row['is_preview'] ?: 0),
                'isFullSong' => true,
                'playbackType' => $row['playback_type'] ?: 'full',
                'licenseNote' => $row['license_note'] ?: 'Authorized Stream',
                'sourceId' => $row['source_id'] ?: null
            ];
        }
    }

    echo json_encode([
        'status' => true,
        'success' => true,
        'count' => count($songs),
        'songs' => $songs,
        'results' => $songs,
        'pagination' => [
            'currentPage' => $page,
            'totalPages' => $totalPages,
            'totalSongs' => $totalSongs,
            'limit' => $limit,
            'hasNextPage' => $page < $totalPages,
            'hasPrevPage' => $page > 1
        ]
    ]);
    exit;
}

// ─── GET ?action=directors ───────────────────────────────────────────────────
if ($action === 'directors') {
    $directors = [];
    // Try to query distinct director_name from songs
    $sql = "SELECT director_name as name, language_id as language, COUNT(*) as song_count,
                   MAX(cover_url) as image, MAX(color) as color
              FROM songs
             WHERE director_name IS NOT NULL AND director_name != ''
             GROUP BY director_name, language_id
             ORDER BY song_count DESC";

    $res = $conn->query($sql);
    if ($res) {
        $idx = 1;
        while ($row = $res->fetch_assoc()) {
            $directors[] = [
                'id' => 'dir-' . $idx++,
                'name' => $row['name'],
                'language' => $row['language'] ?: 'tamil',
                'songCount' => (int)$row['song_count'],
                'image' => $row['image'],
                'color' => $row['color'] ?: '#FF6B00'
            ];
        }
    }

    echo json_encode([
        'status' => true,
        'success' => true,
        'count' => count($directors),
        'directors' => $directors,
        'results' => $directors
    ]);
    exit;
}

// ─── GET ?action=admin_users ─────────────────────────────────────────────────
if ($action === 'admin_users' || $action === 'admin/users') {
    $users = [];
    $res = $conn->query("SELECT id, name, email, role, phone, status, admin_approved, superadmin_approved, email_verified, created_at FROM users ORDER BY id DESC");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $users[] = [
                'id' => (int)$row['id'],
                'name' => $row['name'],
                'email' => $row['email'],
                'role' => $row['role'],
                'phone' => $row['phone'],
                'status' => $row['status'],
                'admin_approved' => (int)$row['admin_approved'],
                'superadmin_approved' => (int)$row['superadmin_approved'],
                'email_verified' => (int)$row['email_verified'],
                'created_at' => $row['created_at']
            ];
        }
    }

    echo json_encode([
        'status' => true,
        'success' => true,
        'count' => count($users),
        'users' => $users
    ]);
    exit;
}

// ─── POST ?action=register ───────────────────────────────────────────────────
if ($action === 'register') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input) || empty($input)) {
        $input = !empty($_POST) ? $_POST : $_GET;
    }

    $name = trim($input['full_name'] ?? $input['name'] ?? $input['username'] ?? '');
    $email = strtolower(trim($input['email'] ?? ''));
    $password = trim($input['password'] ?? '');
    $phone = trim($input['phone'] ?? '');

    if (empty($name) || empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['status' => false, 'success' => false, 'error' => 'Name, email, and password are required']);
        exit;
    }

    // Check if email or name exists in users table
    $stmt = $conn->prepare("SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(name) = ? LIMIT 1");
    if ($stmt) {
        $lowerName = strtolower($name);
        $stmt->bind_param("ss", $email, $lowerName);
        $stmt->execute();
        $stmt->store_result();
        if ($stmt->num_rows > 0) {
            http_response_code(409);
            echo json_encode([
                'status' => false,
                'success' => false,
                'alreadyExists' => true,
                'error' => 'Email or username is already registered in DobbyPay. Please sign in instead.',
                'message' => 'Email or username is already registered in DobbyPay. Please sign in instead.'
            ]);
            $stmt->close();
            exit;
        }
        $stmt->close();
    }

    // Bcrypt Password Hashing ($2y$)
    $hash = password_hash($password, PASSWORD_BCRYPT);

    // Insert user as pending approval
    $ins = $conn->prepare("INSERT INTO users (name, email, password_hash, role, phone, status, email_verified, admin_approved, superadmin_approved) VALUES (?, ?, ?, 'company', ?, 'pending', 1, 0, 0)");
    if (!$ins) {
        http_response_code(500);
        echo json_encode(['status' => false, 'success' => false, 'error' => 'MySQL Prepare Failed: ' . $conn->error]);
        exit;
    }

    $ins->bind_param("ssss", $name, $email, $hash, $phone);
    if (!$ins->execute()) {
        http_response_code(500);
        echo json_encode(['status' => false, 'success' => false, 'error' => 'MySQL Execute Failed: ' . $ins->error]);
        $ins->close();
        exit;
    }

    $uid = $conn->insert_id;
    $ins->close();

    // Create DobbyPay UPI Wallet Account
    $upiId = strtolower(preg_replace('/[^a-z0-9]/', '', $name)) . $uid . '@dobbypay';
    $accNum = 'DP' . rand(100000, 999999);

    try {
        $upiStmt = $conn->prepare("INSERT INTO upi_accounts (user_id, bank_name, account_number, ifsc_code, account_holder, upi_id, balance, is_primary) VALUES (?, 'DobbyPay Digital Bank', ?, 'DOBBY001', ?, ?, 100.00, 1)");
        if ($upiStmt) {
            $upiStmt->bind_param("isss", $uid, $accNum, $name, $upiId);
            $upiStmt->execute();
            $upiStmt->close();
        }

        // Create Welcome Bonus Transaction
        $txRef = 'TXN' . time();
        $txStmt = $conn->prepare("INSERT INTO upi_transactions (sender_upi_id, receiver_upi_id, sender_name, receiver_name, amount, txn_ref, status, note) VALUES ('rewards@dobbypay', ?, 'DobbyPay Rewards', ?, 100.00, ?, 'SUCCESS', 'Spotify Clone Welcome Bonus')");
        if ($txStmt) {
            $txStmt->bind_param("sss", $upiId, $name, $txRef);
            $txStmt->execute();
            $txStmt->close();
        }
    } catch (Throwable $upiEx) {
        error_log('UPI account creation notice: ' . $upiEx->getMessage());
    }

    http_response_code(201);
    echo json_encode([
        'status' => true,
        'success' => true,
        'pendingApproval' => true,
        'message' => 'Registration successful! Your account is awaiting admin approval.',
        'user' => [
            'id' => (int)$uid,
            'name' => $name,
            'username' => $name,
            'email' => $email,
            'role' => 'company',
            'phone' => $phone ?: null,
            'status' => 'pending',
            'admin_approved' => 0,
            'superadmin_approved' => 0,
            'wallet_balance' => 100.00,
            'upi_id' => $upiId,
            'reward_points' => 500,
            'vip_status' => false
        ]
    ]);
    exit;
}

// ─── POST ?action=login ──────────────────────────────────────────────────────
if ($action === 'login') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? $_POST;

    $identifier = strtolower(trim($input['identifier'] ?? $input['email'] ?? $input['username'] ?? ''));
    $password = trim($input['password'] ?? '');

    if (empty($identifier) || empty($password)) {
        http_response_code(400);
        echo json_encode(['status' => false, 'success' => false, 'error' => 'Email/username and password are required']);
        exit;
    }

    $stmt = $conn->prepare("SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(name) = ? LIMIT 1");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(['status' => false, 'success' => false, 'error' => 'Query preparation error: ' . $conn->error]);
        exit;
    }

    $stmt->bind_param("ss", $identifier, $identifier);
    $stmt->execute();
    $res = $stmt->get_result();
    $user = $res ? $res->fetch_assoc() : null;
    $stmt->close();

    if (!$user) {
        http_response_code(404);
        echo json_encode([
            'status' => false,
            'success' => false,
            'userNotFound' => true,
            'wrongPassword' => false,
            'error' => 'User not found in MySQL. Please register an account first.',
            'message' => 'User not found in MySQL. Please register an account first.'
        ]);
        exit;
    }

    // Password Verification (Bcrypt $2y$, $2b$, $2a$, SHA-256 fallback)
    $hash = $user['password_hash'];
    $valid = password_verify($password, $hash);
    if (!$valid && strpos($hash, '$2b$') === 0) {
        $hash2y = '$2y$' . substr($hash, 4);
        $valid = password_verify($password, $hash2y);
    }
    if (!$valid) {
        $sha = hash('sha256', $password);
        if ($user['password_hash'] === $sha || $user['password_hash'] === $password) {
            $valid = true;
        }
    }

    if (!$valid) {
        http_response_code(401);
        echo json_encode([
            'status' => false,
            'success' => false,
            'userNotFound' => false,
            'wrongPassword' => true,
            'error' => 'Incorrect password. Please check your password and try again.',
            'message' => 'Incorrect password. Please check your password and try again.'
        ]);
        exit;
    }

    // Check approval status
    $role = strtolower($user['role'] ?? 'client');
    $isAdminOrSuper = ($role === 'admin' || $role === 'super_admin');
    $userStatus = strtolower($user['status'] ?? 'pending');
    $adminApproved = (int)($user['admin_approved'] ?? 0);
    $superAdminApproved = (int)($user['superadmin_approved'] ?? 0);

    $isApproved = $isAdminOrSuper || ($userStatus === 'active' && ($adminApproved === 1 || $superAdminApproved === 1));

    if (!$isApproved) {
        http_response_code(403);
        echo json_encode([
            'status' => false,
            'success' => false,
            'notApproved' => true,
            'error' => 'Account Pending Admin / Super Admin Approval. Your account must be approved before you can access DobbyPay Music.',
            'message' => 'Account Pending Admin / Super Admin Approval. Your account must be approved before you can access DobbyPay Music.',
            'user' => [
                'id' => (int)$user['id'],
                'name' => $user['name'],
                'username' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'status' => $user['status'] ?? 'pending',
                'admin_approved' => $adminApproved,
                'superadmin_approved' => $superAdminApproved,
                'phone' => $user['phone'] ?? null
            ],
            'adminWhatsApp' => '+918270006116'
        ]);
        exit;
    }

    // Fetch UPI Account balance
    $walletBal = 100.00;
    $upiId = strtolower(preg_replace('/[^a-z0-9]/', '', $user['name'])) . '@dobbypay';

    $uStmt = $conn->prepare("SELECT balance, upi_id FROM upi_accounts WHERE user_id = ? ORDER BY is_primary DESC LIMIT 1");
    if ($uStmt) {
        $uStmt->bind_param("i", $user['id']);
        $uStmt->execute();
        $uRes = $uStmt->get_result();
        if ($uRes && $row = $uRes->fetch_assoc()) {
            $walletBal = (float)$row['balance'];
            if (!empty($row['upi_id'])) $upiId = $row['upi_id'];
        }
        $uStmt->close();
    }

    // Fetch Recent Transactions
    $transactions = [];
    $tStmt = $conn->prepare("SELECT id, sender_upi_id, receiver_upi_id, sender_name, receiver_name, amount, txn_ref, status, note, created_at FROM upi_transactions WHERE receiver_upi_id = ? OR sender_upi_id = ? ORDER BY id DESC LIMIT 20");
    if ($tStmt) {
        $tStmt->bind_param("ss", $upiId, $upiId);
        $tStmt->execute();
        $tRes = $tStmt->get_result();
        if ($tRes) {
            while ($tRow = $tRes->fetch_assoc()) {
                $transactions[] = $tRow;
            }
        }
        $tStmt->close();
    }

    unset($user['password_hash']);
    $user['wallet_balance'] = $walletBal;
    $user['upi_id'] = $upiId;
    $user['reward_points'] = 500;
    $user['vip_status'] = $isAdminOrSuper || ($userStatus === 'active');

    echo json_encode([
        'status' => true,
        'success' => true,
        'message' => "Welcome back, {$user['name']}!",
        'user' => $user,
        'transactions' => $transactions
    ]);
    exit;
}

// ─── POST ?action=approve_user ───────────────────────────────────────────────
if ($action === 'approve_user') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?? $_POST;
    $userId = (int)($input['userId'] ?? $input['id'] ?? 0);
    $approvedBy = trim($input['approvedBy'] ?? 'Super Admin');

    if (!$userId) {
        http_response_code(400);
        echo json_encode(['status' => false, 'success' => false, 'error' => 'User ID is required']);
        exit;
    }

    $stmt = $conn->prepare("SELECT id, name, email, role, status FROM users WHERE id = ? LIMIT 1");
    if (!$stmt) {
        echo json_encode(['status' => false, 'error' => $conn->error]);
        exit;
    }
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $user = $res ? $res->fetch_assoc() : null;
    $stmt->close();

    if (!$user) {
        http_response_code(404);
        echo json_encode(['status' => false, 'success' => false, 'error' => 'User not found in MySQL']);
        exit;
    }

    $upd = $conn->prepare("UPDATE users SET admin_approved = 1, superadmin_approved = 1, status = 'active' WHERE id = ?");
    if ($upd) {
        $upd->bind_param("i", $userId);
        $upd->execute();
        $upd->close();
    }

    echo json_encode([
        'status' => true,
        'success' => true,
        'message' => 'User approved in MySQL database!',
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'status' => 'active',
            'admin_approved' => 1,
            'superadmin_approved' => 1
        ]
    ]);
    exit;
}

// Fallback for unknown action
echo json_encode(['status' => false, 'error' => "Unknown action: {$action}"]);
