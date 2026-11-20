<?php
/**
 * DobbhyPay Admin — User Approval Management
 * Admins approve pending users (Stage 1); Super Admins do final activation (Stage 2).
 * Automatically dispatches HTML notification emails to customers at each stage.
 */
session_start();
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/includes/i18n.php';

if (!isset($_SESSION['admin_id'])) { 
    header('Location: login.php'); 
    exit; 
}

$role      = $_SESSION['admin_role'] ?? 'admin';
$is_super  = ($role === 'super_admin');
$db        = Database::getConnection();
$message   = '';
$msgType   = 'success';

// ── Handle POST actions ────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $uid    = (int)($_POST['user_id'] ?? 0);
    $action = $_POST['action'] ?? '';

    if ($uid > 0) {
        try {
            // Fetch target user details before updating
            $uStmt = $db->prepare("SELECT id, name, email, phone, role, status, admin_approved, superadmin_approved FROM users WHERE id = ? LIMIT 1");
            $uStmt->execute([$uid]);
            $uData = $uStmt->fetch();

            if (!$uData) {
                throw new Exception("User record (ID: $uid) not found.");
            }

            $uName  = $uData['name'] ?: 'User';
            $uEmail = trim($uData['email']);

            if ($action === 'admin_approve') {
                // Admin (or Super Admin) approves step 1
                $db->prepare("UPDATE users SET admin_approved = 1 WHERE id = ?")
                   ->execute([$uid]);

                // Send email to customer (Admin Approved, Awaiting Super Admin)
                sendUserAdminApprovedEmail($uEmail, $uName);

                // Alert Super Admin queue
                sendSuperAdminPendingActivationAlert($uName, $uEmail);

                $message = "✓ User '{$uName}' approved by Admin! Notification email sent to {$uEmail}. Now awaiting Super Admin final activation.";
            } elseif ($action === 'admin_reject') {
                $db->prepare("UPDATE users SET admin_approved = -1, status = 'suspended' WHERE id = ?")
                   ->execute([$uid]);

                sendUserRejectedEmail($uEmail, $uName, 'Admin Review');
                $message = "User '{$uName}' registration rejected. Status email sent to {$uEmail}.";
                $msgType = 'warning';
            } elseif ($action === 'super_approve' && $is_super) {
                // Super admin activates account
                $db->prepare("UPDATE users SET superadmin_approved = 1, status = 'active' WHERE id = ? AND admin_approved = 1")
                   ->execute([$uid]);

                // Send final activation email with direct player login link
                sendUserSuperAdminApprovedEmail($uEmail, $uName);

                $message = "🎉 User '{$uName}' fully activated! Confirmation email with login link (http://localhost:3000/) sent to {$uEmail}.";
            } elseif ($action === 'super_fast_approve' && $is_super) {
                // Super Admin one-click fast-track activation
                $db->prepare("UPDATE users SET admin_approved = 1, superadmin_approved = 1, status = 'active' WHERE id = ?")
                   ->execute([$uid]);

                sendUserSuperAdminApprovedEmail($uEmail, $uName);
                $message = "⚡ Fast-track activated '{$uName}'! Final approval email with login link sent to {$uEmail}.";
            } elseif ($action === 'super_reject' && $is_super) {
                $db->prepare("UPDATE users SET superadmin_approved = -1, status = 'suspended' WHERE id = ?")
                   ->execute([$uid]);

                sendUserRejectedEmail($uEmail, $uName, 'Super Admin Review');
                $message = "User '{$uName}' activation rejected by Super Admin. Status email sent to {$uEmail}.";
                $msgType = 'warning';
            } elseif ($action === 'reactivate' && $is_super) {
                $db->prepare("UPDATE users SET admin_approved = 1, superadmin_approved = 1, status = 'active' WHERE id = ?")
                   ->execute([$uid]);

                sendUserSuperAdminApprovedEmail($uEmail, $uName);
                $message = "User '{$uName}' account reactivated! Notification email sent to {$uEmail}.";
            }
        } catch (Exception $e) {
            $message = 'Error: ' . $e->getMessage();
            $msgType = 'error';
        }
    }
}

// ── Fetch queues ───────────────────────────────────────────────
// Admin queue: needs admin approval
$adminQueue = [];
try {
    $adminQueue = $db->query(
        "SELECT id, name, email, phone, role, created_at
           FROM users
          WHERE status = 'pending' AND admin_approved = 0
            AND role NOT IN ('admin','super_admin')
          ORDER BY created_at ASC"
    )->fetchAll();
} catch (Exception $e) {}

// Super admin queue: admin-approved, waiting for super admin
$superQueue = [];
try {
    $superQueue = $db->query(
        "SELECT id, name, email, phone, role, created_at
           FROM users
          WHERE admin_approved = 1 AND superadmin_approved = 0
            AND status = 'pending'
            AND role NOT IN ('admin','super_admin')
          ORDER BY created_at ASC"
    )->fetchAll();
} catch (Exception $e) {}

// Rejected / suspended users
$rejectedUsers = [];
try {
    $rejectedUsers = $db->query(
        "SELECT id, name, email, role, status, admin_approved, superadmin_approved, created_at
           FROM users
          WHERE (admin_approved = -1 OR superadmin_approved = -1 OR status = 'suspended')
            AND role NOT IN ('admin','super_admin')
          ORDER BY created_at DESC LIMIT 30"
    )->fetchAll();
} catch (Exception $e) {}

$adminQueueCount = count($adminQueue);
$superQueueCount = count($superQueue);

$page_title    = 'User Approvals & Email Dispatch';
$page_subtitle = $is_super ? 'Super Admin Portal: Final activation & customer approval emails' : 'Admin Portal: Review registrations & forward to Super Admin';
require_once __DIR__ . '/includes/header.php';
?>

<style>
.tabs{display:flex;gap:8px;margin-bottom:24px;border-bottom:1px solid var(--border);padding-bottom:0;}
.tab{padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;border-radius:8px 8px 0 0;border:1px solid transparent;border-bottom:none;color:var(--text2);background:none;position:relative;bottom:-1px;}
.tab.active{background:var(--bg2);border-color:var(--border);color:var(--primary);}
.tab-badge{background:var(--primary);color:#000;border-radius:10px;font-size:11px;padding:2px 7px;margin-left:6px;font-weight:700;}
.tab-content{display:none;} .tab-content.active{display:block;}
.user-card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:20px 24px;margin-bottom:12px;display:flex;align-items:center;gap:20px;transition:border-color .2s, box-shadow .2s;}
.user-card:hover{border-color:rgba(255,107,0,.4);box-shadow:0 4px 16px rgba(0,0,0,.25);}
.user-avatar{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#000;flex-shrink:0;}
.user-info{flex:1;}
.user-name{font-size:16px;font-weight:700;margin-bottom:3px;display:flex;align-items:center;gap:8px;}
.user-email{font-size:13px;color:var(--text2);display:flex;align-items:center;gap:6px;}
.user-meta{font-size:12px;color:var(--text3);margin-top:6px;display:flex;align-items:center;gap:12px;}
.action-group{display:flex;gap:8px;flex-shrink:0;align-items:center;}
.btn-approve{background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.4);color:#22C55E;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px;}
.btn-approve:hover{background:rgba(34,197,94,.28);border-color:#22C55E;}
.btn-fast{background:rgba(255,107,0,.15);border:1px solid rgba(255,107,0,.45);color:#FF8C35;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px;}
.btn-fast:hover{background:rgba(255,107,0,.28);border-color:#FF6B00;color:#fff;}
.btn-reject{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#EF4444;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px;}
.btn-reject:hover{background:rgba(239,68,68,.22);border-color:#EF4444;}
.btn-reactivate{background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.3);color:#60A5FA;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px;}
.btn-reactivate:hover{background:rgba(59,130,246,.25);border-color:#60A5FA;}
.empty-state{text-align:center;padding:60px 40px;color:var(--text3);}
.empty-state i{font-size:48px;margin-bottom:16px;display:block;}
.empty-state p{font-size:15px;}
.msg{border-radius:10px;padding:14px 20px;margin-bottom:20px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:12px;}
.msg-success{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.35);color:#4ADE80;}
.msg-warning{background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.35);color:#FCD34D;}
.msg-error{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.35);color:#F87171;}
.step-pill{font-size:11px;padding:4px 10px;border-radius:12px;font-weight:700;}
.pill-admin-done{background:rgba(34,197,94,.15);color:#22C55E;border:1px solid rgba(34,197,94,.3);}
.pill-pending{background:rgba(245,158,11,.15);color:#F59E0B;border:1px solid rgba(245,158,11,.3);}
.pill-rejected{background:rgba(239,68,68,.15);color:#EF4444;border:1px solid rgba(239,68,68,.3);}
.role-badge{font-size:11px;background:rgba(255,255,255,.08);padding:2px 8px;border-radius:6px;color:#aaa;font-weight:600;text-transform:uppercase;}
</style>

<div class="content">
<?php if ($message): ?>
<div class="msg msg-<?= $msgType ?>">
  <i class="fas <?= $msgType === 'success' ? 'fa-check-circle' : ($msgType === 'warning' ? 'fa-exclamation-triangle' : 'fa-times-circle') ?>"></i>
  <?= htmlspecialchars($message) ?>
</div>
<?php endif; ?>

<!-- Tabs -->
<div class="tabs">
  <?php if (!$is_super): ?>
  <button class="tab active" onclick="switchTab('adminQ',this)">
    <i class="fas fa-user-clock"></i> Pending Admin Review
    <?php if ($adminQueueCount): ?><span class="tab-badge"><?= $adminQueueCount ?></span><?php endif; ?>
  </button>
  <?php endif; ?>
  <?php if ($is_super): ?>
  <button class="tab active" onclick="switchTab('superQ',this)">
    <i class="fas fa-crown"></i> Awaiting Super Admin
    <?php if ($superQueueCount): ?><span class="tab-badge" style="background:#22C55E;"><?= $superQueueCount ?></span><?php endif; ?>
  </button>
  <button class="tab" onclick="switchTab('adminQ',this)">
    <i class="fas fa-user-clock"></i> Admin Queue <span class="tab-badge"><?= $adminQueueCount ?></span>
  </button>
  <?php else: ?>
  <button class="tab" onclick="switchTab('superQ',this)">
    <i class="fas fa-crown"></i> Super Admin Queue
    <?php if ($superQueueCount): ?><span class="tab-badge"><?= $superQueueCount ?></span><?php endif; ?>
  </button>
  <?php endif; ?>
  <button class="tab" onclick="switchTab('rejected',this)">
    <i class="fas fa-ban"></i> Rejected / Suspended (<?= count($rejectedUsers) ?>)
  </button>
</div>

<!-- Admin Queue -->
<div class="tab-content <?= !$is_super ? 'active' : '' ?>" id="tab-adminQ">
  <?php if (empty($adminQueue)): ?>
    <div class="empty-state"><i class="fas fa-inbox"></i><p>No pending registrations in Admin Queue. All caught up!</p></div>
  <?php else: foreach ($adminQueue as $u): ?>
  <div class="user-card">
    <div class="user-avatar"><?= strtoupper(mb_substr($u['name'],0,1)) ?></div>
    <div class="user-info">
      <div class="user-name">
        <?= htmlspecialchars($u['name']) ?>
        <span class="role-badge"><?= htmlspecialchars($u['role']) ?></span>
      </div>
      <div class="user-email"><i class="fas fa-envelope"></i> <?= htmlspecialchars($u['email']) ?></div>
      <div class="user-meta">
        <?php if ($u['phone']): ?><span><i class="fas fa-phone"></i> <?= htmlspecialchars($u['phone']) ?></span><?php endif; ?>
        <span><i class="fas fa-calendar"></i> Registered <?= date('M j, Y, h:i A', strtotime($u['created_at'])) ?></span>
        <span class="step-pill pill-pending">Step 1: Needs Admin Approval</span>
      </div>
    </div>
    <div class="action-group">
      <?php if (!$is_super): ?>
      <form method="POST" style="display:inline" onsubmit="return confirm('Approve this registration? Notification email will be sent to <?= htmlspecialchars($u['email']) ?>.')">
        <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
        <input type="hidden" name="action" value="admin_approve">
        <button type="submit" class="btn-approve"><i class="fas fa-paper-plane"></i> Approve & Send Mail</button>
      </form>
      <form method="POST" style="display:inline" onsubmit="return confirm('Reject this registration?')">
        <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
        <input type="hidden" name="action" value="admin_reject">
        <button type="submit" class="btn-reject"><i class="fas fa-times"></i> Reject</button>
      </form>
      <?php else: ?>
      <!-- Super Admin can either Admin Approve or Fast-Track Activate directly -->
      <form method="POST" style="display:inline" onsubmit="return confirm('Admin-approve this user and send notification email?')">
        <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
        <input type="hidden" name="action" value="admin_approve">
        <button type="submit" class="btn-approve" title="Approve step 1 and send mail"><i class="fas fa-check"></i> Admin Approve</button>
      </form>
      <form method="POST" style="display:inline" onsubmit="return confirm('⚡ Fast-Track: Approve and fully activate <?= htmlspecialchars($u['email']) ?> immediately?')">
        <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
        <input type="hidden" name="action" value="super_fast_approve">
        <button type="submit" class="btn-fast" title="Instantly activate and send login mail"><i class="fas fa-bolt"></i> Fast-Track Activate & Mail</button>
      </form>
      <form method="POST" style="display:inline" onsubmit="return confirm('Reject this registration?')">
        <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
        <input type="hidden" name="action" value="admin_reject">
        <button type="submit" class="btn-reject"><i class="fas fa-times"></i> Reject</button>
      </form>
      <?php endif; ?>
    </div>
  </div>
  <?php endforeach; endif; ?>
</div>

<!-- Super Admin Queue -->
<div class="tab-content <?= $is_super ? 'active' : '' ?>" id="tab-superQ">
  <?php if (empty($superQueue)): ?>
    <div class="empty-state"><i class="fas fa-crown"></i><p>No accounts awaiting Super Admin activation.</p></div>
  <?php else: foreach ($superQueue as $u): ?>
  <div class="user-card" style="border-left:4px solid #22C55E;">
    <div class="user-avatar" style="background:linear-gradient(135deg,#22C55E,#16A34A);"><?= strtoupper(mb_substr($u['name'],0,1)) ?></div>
    <div class="user-info">
      <div class="user-name">
        <?= htmlspecialchars($u['name']) ?>
        <span class="role-badge"><?= htmlspecialchars($u['role']) ?></span>
      </div>
      <div class="user-email"><i class="fas fa-envelope"></i> <?= htmlspecialchars($u['email']) ?></div>
      <div class="user-meta">
        <span class="step-pill pill-admin-done"><i class="fas fa-check"></i> Admin Approved</span>
        <?php if ($u['phone']): ?><span><i class="fas fa-phone"></i> <?= htmlspecialchars($u['phone']) ?></span><?php endif; ?>
        <span><i class="fas fa-calendar"></i> Registered <?= date('M j, Y', strtotime($u['created_at'])) ?></span>
      </div>
    </div>
    <div class="action-group">
      <?php if ($is_super): ?>
      <form method="POST" style="display:inline" onsubmit="return confirm('Activate this account? Official approval email with login link (http://localhost:3000/) will be sent to <?= htmlspecialchars($u['email']) ?>.')">
        <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
        <input type="hidden" name="action" value="super_approve">
        <button type="submit" class="btn-approve" style="background:#22C55E;color:#000;font-weight:700;"><i class="fas fa-paper-plane"></i> Activate & Send Mail</button>
      </form>
      <form method="POST" style="display:inline" onsubmit="return confirm('Reject this activation?')">
        <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
        <input type="hidden" name="action" value="super_reject">
        <button type="submit" class="btn-reject"><i class="fas fa-times"></i> Reject</button>
      </form>
      <?php else: ?>
      <span class="step-pill pill-pending">Waiting for Super Admin</span>
      <?php endif; ?>
    </div>
  </div>
  <?php endforeach; endif; ?>
</div>

<!-- Rejected -->
<div class="tab-content" id="tab-rejected">
  <?php if (empty($rejectedUsers)): ?>
    <div class="empty-state"><i class="fas fa-check-double"></i><p>No rejected or suspended accounts.</p></div>
  <?php else: foreach ($rejectedUsers as $u): ?>
  <div class="user-card" style="opacity:0.85;">
    <div class="user-avatar" style="background:rgba(239,68,68,.2);color:#EF4444;">❌</div>
    <div class="user-info">
      <div class="user-name"><?= htmlspecialchars($u['name']) ?></div>
      <div class="user-email"><?= htmlspecialchars($u['email']) ?></div>
      <div class="user-meta">
        <span class="step-pill pill-rejected"><?= ucfirst($u['status']) ?></span>
        &nbsp;Admin: <?= $u['admin_approved'] == -1 ? '<span style="color:#EF4444">Rejected</span>' : ($u['admin_approved'] ? '<span style="color:#22C55E">✓</span>' : 'Pending') ?>
        &nbsp;SuperAdmin: <?= $u['superadmin_approved'] == -1 ? '<span style="color:#EF4444">Rejected</span>' : ($u['superadmin_approved'] ? '<span style="color:#22C55E">✓</span>' : 'Pending') ?>
      </div>
    </div>
    <?php if ($is_super): ?>
    <div class="action-group">
      <form method="POST" style="display:inline" onsubmit="return confirm('Reactivate this user and send activation email?')">
        <input type="hidden" name="user_id" value="<?= $u['id'] ?>">
        <input type="hidden" name="action" value="reactivate">
        <button type="submit" class="btn-reactivate"><i class="fas fa-undo"></i> Reactivate & Send Mail</button>
      </form>
    </div>
    <?php endif; ?>
  </div>
  <?php endforeach; endif; ?>
</div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
<script>
function switchTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
}
</script>
