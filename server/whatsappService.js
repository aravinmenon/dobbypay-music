/**
 * WhatsApp notifications for registration + approval.
 *
 * Modes (first match wins for server-side send):
 * 1) Meta WhatsApp Cloud API — WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID
 * 2) Twilio WhatsApp — TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM
 * 3) CallMeBot (admin personal notify) — CALLMEBOT_APIKEY (+ phone)
 *
 * Always returns a wa.me deep link so web/APK can auto-open WhatsApp
 * even when no Cloud API credentials are configured.
 */

function digitsOnly(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

export function normalizeWhatsAppPhone(value, defaultCountry = '91') {
  let d = digitsOnly(value);
  if (!d) return '';
  if (d.length === 10) d = `${defaultCountry}${d}`;
  return d;
}

export function getAdminWhatsAppPhone() {
  return normalizeWhatsAppPhone(process.env.ADMIN_WHATSAPP || '+918270006116');
}

export function getSuperAdminWhatsAppPhone() {
  return normalizeWhatsAppPhone(
    process.env.SUPER_ADMIN_WHATSAPP || process.env.ADMIN_WHATSAPP || '+918270006116'
  );
}

export function buildWaMeUrl(phone, message) {
  const to = normalizeWhatsAppPhone(phone);
  if (!to) return null;
  return `https://wa.me/${to}?text=${encodeURIComponent(String(message || ''))}`;
}

export function buildRegistrationAdminMessage(user = {}) {
  return (
    `🆕 *DobbyPay Music — New Registration*\n\n` +
    `👤 Name: ${user.name || user.username || 'User'}\n` +
    `📧 Email: ${user.email || 'N/A'}\n` +
    `📱 Phone: ${user.phone || 'N/A'}\n` +
    `🆔 User ID: ${user.id || 'N/A'}\n` +
    `💼 Role: ${user.role || 'client'}\n` +
    `📌 Status: pending approval\n\n` +
    `Please open Admin Panel and approve this account.\n` +
    `Web: https://dobbypay-music.onrender.com/`
  );
}

export function buildApprovalUserMessage(user = {}, stage = 'super_approve', approvedBy = 'Admin') {
  const name = user.name || user.username || 'User';
  if (stage === 'admin_approve') {
    return (
      `✅ *DobbyPay Music*\n\n` +
      `Hi ${name}, Admin (${approvedBy}) approved your registration.\n` +
      `Waiting for Super Admin final activation before you can log in.`
    );
  }
  if (stage === 'admin_reject' || stage === 'super_reject') {
    return (
      `🚫 *DobbyPay Music*\n\n` +
      `Hi ${name}, your registration was not approved (${approvedBy}).\n` +
      `Contact support on WhatsApp if you need help.`
    );
  }
  if (stage === 'reactivate' || stage === 'super_approve' || stage === 'super_fast_approve') {
    return (
      `🎉 *DobbyPay Music — Account Approved*\n\n` +
      `Hi ${name}, your account is now *active*.\n` +
      `You can log in here:\nhttps://dobbypay-music.onrender.com/\n\n` +
      `Approved by: ${approvedBy}`
    );
  }
  return (
    `📢 *DobbyPay Music*\n\nHi ${name}, your account status was updated by ${approvedBy}.`
  );
}

async function sendViaMetaCloud(toPhone, message) {
  const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return null;

  const template = process.env.WHATSAPP_TEMPLATE_NAME;
  const body = template
    ? {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'template',
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: String(message).slice(0, 1000) }],
            },
          ],
        },
      }
    : {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'text',
        text: { preview_url: false, body: String(message).slice(0, 4000) },
      };

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Meta WhatsApp HTTP ${res.status}`);
  }
  return { provider: 'meta_cloud', data };
}

async function sendViaTwilio(toPhone, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886
  if (!sid || !token || !from) return null;

  const auth = Buffer.from(`${sid}:${token}`).toString('base64');
  const params = new URLSearchParams({
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    To: `whatsapp:+${toPhone}`,
    Body: String(message).slice(0, 1500),
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Twilio WhatsApp HTTP ${res.status}`);
  }
  return { provider: 'twilio', data };
}

async function sendViaCallMeBot(toPhone, message) {
  const apiKey = process.env.CALLMEBOT_APIKEY;
  if (!apiKey) return null;
  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(toPhone)}` +
    `&text=${encodeURIComponent(String(message).slice(0, 1500))}` +
    `&apikey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`CallMeBot HTTP ${res.status}: ${text.slice(0, 120)}`);
  return { provider: 'callmebot', data: text };
}

/**
 * Try server-side WhatsApp send; always include wa.me fallback URL.
 */
export async function notifyWhatsApp({ toPhone, message, label = 'notify' }) {
  const phone = normalizeWhatsAppPhone(toPhone);
  const whatsappUrl = buildWaMeUrl(phone, message);
  if (!phone) {
    return {
      sent: false,
      mode: 'skipped',
      reason: 'missing_phone',
      whatsappUrl: null,
      message,
    };
  }

  try {
    const meta = await sendViaMetaCloud(phone, message);
    if (meta) {
      console.log(`📱 WhatsApp [${label}] sent via Meta Cloud → ${phone}`);
      return { sent: true, mode: 'api', provider: meta.provider, whatsappUrl, message };
    }
    const twilio = await sendViaTwilio(phone, message);
    if (twilio) {
      console.log(`📱 WhatsApp [${label}] sent via Twilio → ${phone}`);
      return { sent: true, mode: 'api', provider: twilio.provider, whatsappUrl, message };
    }
    const bot = await sendViaCallMeBot(phone, message);
    if (bot) {
      console.log(`📱 WhatsApp [${label}] sent via CallMeBot → ${phone}`);
      return { sent: true, mode: 'api', provider: bot.provider, whatsappUrl, message };
    }
  } catch (err) {
    console.warn(`📱 WhatsApp [${label}] API send failed:`, err.message);
    return {
      sent: false,
      mode: 'link_fallback',
      error: err.message,
      whatsappUrl,
      message,
    };
  }

  console.log(`📱 WhatsApp [${label}] no API keys — returning wa.me link for ${phone}`);
  return {
    sent: false,
    mode: 'link_fallback',
    reason: 'no_whatsapp_api_configured',
    whatsappUrl,
    message,
  };
}

export async function notifyAdminNewRegistration(user) {
  const adminPhone = getAdminWhatsAppPhone();
  const message = buildRegistrationAdminMessage(user);
  return notifyWhatsApp({
    toPhone: adminPhone,
    message,
    label: 'register→admin',
  });
}

export async function notifyUserApproval(user, stage, approvedBy) {
  const userPhone = normalizeWhatsAppPhone(user?.phone);
  const message = buildApprovalUserMessage(user, stage, approvedBy);
  // If user has no phone, still build a link targeting admin so staff can forward
  const target = userPhone || getAdminWhatsAppPhone();
  return notifyWhatsApp({
    toPhone: target,
    message,
    label: `approve→${stage}`,
  });
}
