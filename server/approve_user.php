<?php
/**
 * DobbhyPay REST API — User Approvals & Email Notification
 * 
 * Location:
 *   http://localhost:40/dobbhypay/backend/api/approve_user.php
 * 
 * Methods:
 *   GET  /backend/api/approve_user.php
 *        Returns all queues (pending admin, awaiting super admin, rejected)
 * 
 *   POST /backend/api/approve_user.php
 *        Payload: { "user_id": 12, "action": "admin_approve" | "super_approve" | "super_fast_approve" | "admin_reject" | "super_reject" | "reactivate" }
 *        Updates status and dispatches automated HTML customer notification emails.
 */

require_once __DIR__ . '/../helpers/api_helper.php';
require_once __DIR__ . '/../helpers/mailer.php';

$db     = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // 1. Fetch pending admin queue
    $adminQueue = $db->query(
        "SELECT id, name, email, phone, role, status, admin_approved, superadmin_approved, created_at
           FROM users
          WHERE status = 'pending' AND admin_approved = 0
            AND role NOT IN ('admin','super_admin')
          ORDER BY created_at ASC"
    )->fetchAll();

    // 2. Fetch awaiting super admin queue
    $superQueue = $db->query(
        "SELECT id, name, email, phone, role, status, admin_approved, superadmin_approved, created_at
           FROM users
          WHERE admin_approved = 1 AND superadmin_approved = 0
            AND status = 'pending'
            AND role NOT IN ('admin','super_admin')
          ORDER BY created_at ASC"
    )->fetchAll();

    // 3. Fetch rejected / suspended queue
    $rejectedQueue = $db->query(
        "SELECT id, name, email, phone, role, status, admin_approved, superadmin_approved, created_at
           FROM users
          WHERE (admin_approved = -1 OR superadmin_approved = -1 OR status = 'suspended')
            AND role NOT IN ('admin','super_admin')
          ORDER BY created_at DESC LIMIT 30"
    )->fetchAll();

    respond([
        'admin_queue'       => $adminQueue,
        'super_queue'       => $superQueue,
        'rejected_queue'    => $rejectedQueue,
        'admin_queue_count' => count($adminQueue),
        'super_queue_count' => count($superQueue)
    ]);
}

if ($method === 'POST') {
    $body   = getBody();
    $uid    = (int)($body['user_id'] ?? $_POST['user_id'] ?? 0);
    $action = trim($body['action'] ?? $_POST['action'] ?? 'super_approve');

    if ($uid <= 0) {
        respondError('user_id is required.', 400);
    }

    // Fetch user details
    $uStmt = $db->prepare("SELECT id, name, email, phone, role, status, admin_approved, superadmin_approved FROM users WHERE id = ? LIMIT 1");
    $uStmt->execute([$uid]);
    $user = $uStmt->fetch();

    if (!$user) {
        respondError("User with ID $uid does not exist in database.", 404);
    }

    $uName  = $user['name'] ?: 'Valued Listener';
    $uEmail = trim($user['email']);
    $emailSent = false;
    $msg = '';

    try {
        switch ($action) {
            case 'admin_approve':
                // Stage 1: Admin approves
                $db->prepare("UPDATE users SET admin_approved = 1 WHERE id = ?")->execute([$uid]);
                $emailSent = sendUserAdminApprovedEmail($uEmail, $uName);
                sendSuperAdminPendingActivationAlert($uName, $uEmail);
                $msg = "User '$uName' approved by Admin. Awaiting Super Admin activation. Email sent to $uEmail.";
                break;

            case 'super_approve':
                // Stage 2: Super Admin activates
                $db->prepare("UPDATE users SET superadmin_approved = 1, status = 'active' WHERE id = ? AND admin_approved = 1")->execute([$uid]);
                $emailSent = sendUserSuperAdminApprovedEmail($uEmail, $uName);
                $msg = "User '$uName' fully activated! Login confirmation email sent to $uEmail.";
                break;

            case 'super_fast_approve':
                // 1-Click Fast-Track: Approve both admin and super admin
                $db->prepare("UPDATE users SET admin_approved = 1, superadmin_approved = 1, status = 'active' WHERE id = ?")->execute([$uid]);
                $emailSent = sendUserSuperAdminApprovedEmail($uEmail, $uName);
                $msg = "⚡ Fast-track activated user '$uName'! Login email sent to $uEmail.";
                break;

            case 'admin_reject':
                $db->prepare("UPDATE users SET admin_approved = -1, status = 'suspended' WHERE id = ?")->execute([$uid]);
                $emailSent = sendUserRejectedEmail($uEmail, $uName, 'Admin Review');
                $msg = "User '$uName' registration rejected by Admin. Notification email sent to $uEmail.";
                break;

            case 'super_reject':
                $db->prepare("UPDATE users SET superadmin_approved = -1, status = 'suspended' WHERE id = ?")->execute([$uid]);
                $emailSent = sendUserRejectedEmail($uEmail, $uName, 'Super Admin Review');
                $msg = "User '$uName' activation rejected by Super Admin. Status email sent to $uEmail.";
                break;

            case 'reactivate':
                $db->prepare("UPDATE users SET admin_approved = 1, superadmin_approved = 1, status = 'active' WHERE id = ?")->execute([$uid]);
                $emailSent = sendUserSuperAdminApprovedEmail($uEmail, $uName);
                $msg = "User '$uName' account reactivated. Confirmation email sent to $uEmail.";
                break;

            default:
                respondError("Invalid action '$action'. Allowed: admin_approve, super_approve, super_fast_approve, admin_reject, super_reject, reactivate", 400);
        }

        // Fetch updated user object
        $uStmt->execute([$uid]);
        $updatedUser = $uStmt->fetch();

        respond([
            'message'    => $msg,
            'action'     => $action,
            'email_sent' => $emailSent,
            'user'       => $updatedUser
        ]);

    } catch (Throwable $e) {
        respondError('Database update error: ' . $e->getMessage(), 500);
    }
}

respondError('Method not allowed. Use GET or POST.', 405);
