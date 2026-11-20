<?php
/**
 * DobbypPay API Router & Gateway Index
 * Prevents 403 Forbidden on /backend/api/ and routes actions
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? $_GET['route'] ?? '';

// Route to specific api scripts if requested via ?action= or ?route=
if ($action === 'songs') {
    require __DIR__ . '/songs.php';
    exit;
} elseif ($action === 'auth' || $action === 'login' || $action === 'register') {
    require __DIR__ . '/auth.php';
    exit;
} elseif ($action === 'upi') {
    require __DIR__ . '/upi.php';
    exit;
} elseif ($action === 'payments') {
    require __DIR__ . '/payments.php';
    exit;
} elseif ($action === 'clients') {
    require __DIR__ . '/clients.php';
    exit;
} elseif ($action === 'invoices') {
    require __DIR__ . '/invoices.php';
    exit;
}

// Default response when accessing /backend/api/
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$basePath = (strpos($_SERVER['REQUEST_URI'] ?? '', '/dobbhypay') === 0) ? '/dobbhypay/backend/api' : '/backend/api';

echo json_encode([
    'success'   => true,
    'status'    => 'online',
    'message'   => 'DobbyPay Backend API Gateway is active and running',
    'endpoints' => [
        'songs'     => $protocol . $host . '/backend/api/songs.php',
        'auth'      => $protocol . $host . '/backend/api/auth.php',
        'upi'       => $protocol . $host . '/backend/api/upi.php',
        'payments'  => $protocol . $host . '/backend/api/payments.php',
        'clients'   => $protocol . $host . '/backend/api/clients.php',
        'invoices'  => $protocol . $host . '/backend/api/invoices.php',
        'offers'    => $protocol . $host . '/backend/api/offers.php',
        'branding'  => $protocol . $host . '/backend/api/get_branding.php'
    ],
    'timestamp' => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

