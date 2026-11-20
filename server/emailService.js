import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter = null;

/**
 * Initialize or get existing Nodemailer transporter
 */
async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587');

  if (host && user && pass) {
    // Production/Custom SMTP (Gmail, Outlook, SendGrid, Amazon SES, etc.)
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 4000,
      tls: { rejectUnauthorized: false }
    });
    console.log(`📧 Configured real SMTP email transporter with host: ${host}`);
  } else {
    // Development local dispatcher: instantaneous, never hangs
    transporter = {
      sendMail: async (mailOptions) => {
        console.log(`📬 [EMAIL DISPATCHED] To: ${mailOptions.to} | Subject: "${mailOptions.subject}"`);
        return { messageId: 'dobbypay-mail-' + Date.now() };
      }
    };
    console.log('📧 Configured local email dispatcher (set SMTP_HOST, SMTP_USER, SMTP_PASS in .env for external relay)');
  }

  return transporter;
}

export { getTransporter };

/**
 * Generic email sender using active transporter
 */
export async function sendCustomEmail({ to, subject, html, text }) {
  if (!to) return { success: false, error: 'Recipient required' };
  try {
    const mailTransporter = await getTransporter();
    const fromAddress = process.env.SMTP_FROM || '"DobbyPay Music" <noreply@dobbypay.com>';
    const info = await mailTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: text || '',
      html: html || text
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Error sending custom email:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send account approval email to customer (supports both Admin stage 1 and Super Admin stage 2)
 * @param {Object} options
 * @param {string} options.toEmail Customer's email
 * @param {string} options.customerName Customer's display name
 * @param {string} options.role Customer's role (client / company)
 * @param {string} options.approvedBy Who approved the account ('Admin' or 'Super Admin')
 * @param {string} options.stage 'admin_approve' | 'super_approve' | 'reactivate' | 'reject'
 */
export async function sendCustomerApprovalEmail({ toEmail, customerName, role = 'client', approvedBy = 'Admin & Super Admin', stage = 'super_approve' }) {
  if (!toEmail) return { success: false, error: 'Recipient email required' };

  const name = customerName || 'Valued Listener';
  const mailTransporter = await getTransporter();
  const appUrl = process.env.APP_URL || 'http://localhost:3000/';
  const fromAddress = process.env.SMTP_FROM || '"DobbyPay Music Support" <noreply@dobbypay.com>';

  const isAdminStage = stage === 'admin_approve';
  const isRejected = stage === 'admin_reject' || stage === 'super_reject';

  let subject = '🎉 Your DobbyPay Music Account Has Been Approved & Activated!';
  if (isAdminStage) {
    subject = '⏳ DobbyPay Music: Registration Approved by Admin (Pending Final Activation)';
  } else if (isRejected) {
    subject = 'DobbyPay Music: Account Registration Status Update';
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0b0d; color: #ffffff; margin: 0; padding: 20px; }
    .email-container { max-width: 600px; margin: 0 auto; background: #18181c; border-radius: 16px; overflow: hidden; border: 1px solid ${isRejected ? 'rgba(239,68,68,0.4)' : isAdminStage ? 'rgba(255,107,0,0.4)' : 'rgba(34,197,94,0.4)'}; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: ${isRejected ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : isAdminStage ? 'linear-gradient(135deg, #FF6B00 0%, #d97706 100%)' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'}; padding: 30px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; color: rgba(255,255,255,0.95); font-size: 14px; font-weight: 600; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .message { font-size: 15px; color: #d4d4d8; line-height: 1.6; margin-bottom: 24px; }
    .badge-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
    .status-badge { background: ${isRejected ? '#ef4444' : isAdminStage ? '#FF6B00' : '#22c55e'}; color: #000000; font-weight: 800; font-size: 12px; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; }
    .features-list { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 18px 20px; margin-bottom: 28px; border: 1px solid rgba(255,255,255,0.06); }
    .feature-item { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #e4e4e7; margin-bottom: 10px; }
    .feature-item:last-child { margin-bottom: 0; }
    .btn-container { text-align: center; margin-bottom: 30px; }
    .btn-login { display: inline-block; background: linear-gradient(135deg, #FF6B00 0%, #ea580c 100%); color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 16px; padding: 14px 36px; border-radius: 30px; box-shadow: 0 4px 15px rgba(255, 107, 0, 0.4); }
    .footer { background: #111113; padding: 20px 24px; text-align: center; font-size: 12px; color: #71717a; border-top: 1px solid rgba(255,255,255,0.05); }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🎵 DobbyPay Music Cloud</h1>
      <p>${isRejected ? 'Account Review Notification' : isAdminStage ? 'Step 1: Admin Approved — Awaiting Super Admin' : 'Super Admin Approved — Full Access Granted'}</p>
    </div>

    <div class="content">
      <div class="greeting">Hi ${name}! ${isRejected ? '' : '🎉'}</div>
      
      ${isRejected ? `
        <p class="message">
          Your account registration was reviewed by <strong>${approvedBy}</strong> and could not be approved at this time. Please contact support via WhatsApp or email if you need assistance.
        </p>
      ` : isAdminStage ? `
        <p class="message">
          Your registration for <strong>DobbyPay Music</strong> has been reviewed and <strong style="color: #22c55e;">APPROVED by Admin</strong>! Your account has moved to the final queue awaiting <strong>Super Admin activation</strong>.
        </p>
        <div class="badge-card">
          <div>
            <div style="font-weight: 700; color: #ffffff; font-size: 14px;">Review Status</div>
            <div style="font-size: 12px; color: #a1a1aa;">Email: ${toEmail} | Role: ${role}</div>
          </div>
          <span class="status-badge">Admin Approved (1 of 2)</span>
        </div>
        <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
          You will receive an instant notification email as soon as Super Admin activates your account so you can log in at <strong style="color:#FF6B00;">${appUrl}</strong>.
        </p>
      ` : `
        <p class="message">
          We are thrilled to let you know that your registration for <strong>DobbyPay Music</strong> has been officially reviewed and <strong style="color: #22c55e;">ACTIVATED</strong> by the <strong>${approvedBy}</strong>!
        </p>
        <div class="badge-card">
          <div>
            <div style="font-weight: 700; color: #ffffff; font-size: 14px;">Account Status</div>
            <div style="font-size: 12px; color: #a1a1aa;">Email: ${toEmail} | Role: ${role}</div>
          </div>
          <span class="status-badge">Active & Ready</span>
        </div>
        <div class="features-list">
          <div style="font-size: 13px; font-weight: 700; color: #FF6B00; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">Your Unlocked Privileges</div>
          <div class="feature-item">⚡ <strong>Unlimited Music Catalog:</strong> 900+ Full Songs in Tamil, Telugu, Hindi, Malayalam & English</div>
          <div class="feature-item">💰 <strong>Welcome Balance:</strong> $100.00 DobbyPay UPI Wallet & 500 Reward Points</div>
          <div class="feature-item">💎 <strong>VIP Hi-Fi Mode:</strong> 24-bit Lossless Studio Audio Quality</div>
          <div class="feature-item">📱 <strong>Offline Downloader:</strong> Device Local Storage download enabled</div>
        </div>
        <div class="btn-container">
          <a href="${appUrl}" class="btn-login" target="_blank">Sign In & Start Listening</a>
        </div>
        <p style="font-size: 13px; color: #a1a1aa; text-align: center; margin: 0;">
          You can now log in at <a href="${appUrl}" style="color: #FF6B00;">${appUrl}</a> using your registered email and password.
        </p>
      `}
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;">This is an automated notification from DobbyPay Digital Systems.</p>
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} DobbyPay Music Cloud. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const info = await mailTransporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: subject,
      text: `Hello ${name}!\n\nYour DobbyPay Music account (${toEmail}) status has been updated by ${approvedBy}.\n\nBest regards,\nDobbyPay Team`,
      html: htmlContent
    });

    let previewUrl = null;
    if (nodemailer.getTestMessageUrl) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`📬 Customer approval email preview URL: ${previewUrl}`);
      }
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null
    };
  } catch (err) {
    console.error(`❌ Failed to send approval email to ${toEmail}:`, err.message);
    return {
      success: false,
      error: err.message
    };
  }
}
