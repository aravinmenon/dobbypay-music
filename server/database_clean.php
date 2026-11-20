<?php
/**
 * DobbypPay Database Configuration
 */

define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3310');          // XAMPP MySQL port
define('DB_NAME', 'dobbyppay');
define('DB_USER', 'root');          // XAMPP default is 'root'
define('DB_PASS', '');              // XAMPP default is empty string
define('DB_CHARSET', 'utf8mb4');

define('APP_NAME', 'DobbypPay');
define('APP_URL',  'http://localhost/dobbhypay');
define('APP_ENV',  'development'); // 'production' in prod

// JWT / Session
define('JWT_SECRET', 'change_this_super_secret_key_in_production_DobbypPay_2026');
define('SESSION_LIFETIME', 86400); // 24 hours

// PayPal
define('PAYPAL_CLIENT_ID',     'YOUR_PAYPAL_CLIENT_ID');
define('PAYPAL_CLIENT_SECRET', 'YOUR_PAYPAL_CLIENT_SECRET');
define('PAYPAL_MODE',          'sandbox'); // 'live' in production

// Email (Office 365 SMTP Configuration)
define('MAILHOST',      'smtp.office365.com');
define('PORT',          '587');
define('USERNAME',      'aetinssmtp@kgisl.com');
define('PASSWORD',      'Trigger@12345');
define('SETFROM',       'aetinssmtp@kgisl.com');
define('REPLYTO',       'aetinssmtp@kgisl.com');

define('SMTP_HOST',     'smtp.office365.com');
define('SMTP_PORT',     587);
define('SMTP_USER',     'aetinssmtp@kgisl.com');
define('SMTP_PASS',     'Trigger@12345');
define('SMTP_FROM_NAME','DobbyPay Music Cloud');
define('ADMIN_EMAIL',   'aravinmenon000@gmail.com');

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
            );
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                http_response_code(500);
                die(json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]));
            }
        }
        return self::$instance;
    }

    private function __construct() {}
    private function __clone() {}
}
