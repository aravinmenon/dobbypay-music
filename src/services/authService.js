import { Capacitor, CapacitorHttp } from '@capacitor/core';

// Detect runtime environment:
const isNativeApp = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform();
const isLocalBrowser = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  !isNativeApp;

/**
 * Resolves the API base URL:
 * 1. User manual override (from In-App Server Config modal)
 * 2. VITE_API_BASE_URL environment variable
 * 3. Native Android default: http://10.0.2.2:5000 (standard Android emulator loopback to host)
 * 4. Local Web Dev: '/api' (proxied via Vite to http://127.0.0.1:5000)
 * 5. Production Web: window.location.origin
 */
/** Hosts that return HTML challenges / Safe Browsing blocks — never use for APK API. */
function isBlockedPublicHost(url) {
  const u = String(url || '').toLowerCase();
  return u.includes('rf.gd') || u.includes('infinityfree') || u.includes('infinityfreeapp.com');
}

/** Drop overrides that point at dead/blocked hosts so APK falls back to VITE_API_BASE_URL. */
export function clearDeadApiOverride(errorMessage = '') {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('dobbypay_api_url');
  if (!saved) return false;
  const msg = String(errorMessage || '');
  const hostMatch = msg.match(/Unable to resolve host ["']?([^"'\s]+)/i);
  const deadHost = hostMatch?.[1] || '';
  if (
    (deadHost && saved.includes(deadHost)) ||
    (msg.includes('Unable to resolve host') && saved.includes('trycloudflare.com'))
  ) {
    localStorage.removeItem('dobbypay_api_url');
    return true;
  }
  return false;
}

export function getApiBase() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('dobbypay_api_url');
    if (saved && saved.trim()) {
      const cleaned = saved.trim().replace(/\/+$/, '');
      // Drop stale PHP / XAMPP / known-bad overrides — app uses Express + Clever Cloud MySQL
      if (
        isBlockedPublicHost(cleaned) ||
        cleaned.includes('dobbhypay/backend') ||
        cleaned.endsWith('.php') ||
        cleaned.includes(':40/') ||
        cleaned.includes('sing-bras-jul-after.trycloudflare.com') ||
        cleaned.includes('clicks-kingston-mainland-surprising.trycloudflare.com')
      ) {
        localStorage.removeItem('dobbypay_api_url');
      } else {
        return cleaned;
      }
    }
  }

  // Prefer Vite env when it is the Express API (not the old PHP XAMPP path)
  const envBase = import.meta.env.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL).trim().replace(/\/+$/, '')
    : '';
  const envIsExpress =
    envBase &&
    !isBlockedPublicHost(envBase) &&
    !envBase.includes('dobbhypay/backend') &&
    !envBase.endsWith('.php');
  const envIsPublicHttp =
    envIsExpress && /^https?:\/\//i.test(envBase) &&
    !/localhost|127\.0\.0\.1/i.test(envBase);

  // Capacitor Native Android APK — must use a public/LAN Express URL (phones cannot use localhost)
  if (isNativeApp) {
    if (envIsPublicHttp) {
      return envBase.endsWith('/api') ? envBase : `${envBase}/api`;
    }
    if (envIsExpress && /^https?:\/\//i.test(envBase)) {
      // Absolute URL that happens to mention localhost → rewrite for emulator only
      return envBase
        .replace('localhost', '10.0.2.2')
        .replace('127.0.0.1', '10.0.2.2');
    }
    // Last resort emulator loopback (real phones need VITE_API_BASE_URL public HTTPS)
    return 'http://10.0.2.2:5000/api';
  }

  // Local Web Browser → Vite proxies /api to Express :5000 (Clever Cloud MySQL)
  if (isLocalBrowser) {
    if (envIsPublicHttp) return envBase.endsWith('/api') ? envBase : `${envBase}/api`;
    return envIsExpress && envBase !== '/api' && /^https?:\/\//i.test(envBase) ? envBase : '/api';
  }

  // Production Web Deployment
  if (envIsExpress) {
    return envBase.endsWith('/api') || envBase === '/api' ? envBase : `${envBase}/api`;
  }

  return '/api';
}

/** Save / clear the in-app API override used by the APK and web client. */
export function setApiBaseOverride(url) {
  if (typeof window === 'undefined') return { ok: false, error: 'No window' };
  const cleaned = String(url || '').trim().replace(/\/+$/, '');
  if (!cleaned) {
    localStorage.removeItem('dobbypay_api_url');
    return { ok: true, cleared: true };
  }
  if (isBlockedPublicHost(cleaned)) {
    return {
      ok: false,
      error: 'This host blocks APIs (HTML challenge / Dangerous site). Use your PC LAN IP or a real VPS/domain instead of rf.gd / InfinityFree.',
    };
  }
  if (!/^https?:\/\//i.test(cleaned)) {
    return { ok: false, error: 'URL must start with http:// or https://' };
  }
  localStorage.setItem('dobbypay_api_url', cleaned);
  return { ok: true, url: cleaned };
}

/**
 * Cleanly resolves API endpoint against base URL without duplicate PHP script paths
 */
export function resolveApiUrl(base, endpoint) {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  
  const cleanBase = (base || '').trim().replace(/\/+$/, '');
  
  // If base points directly to a PHP file (e.g. api.php)
  if (cleanBase.endsWith('.php')) {
    const actionMatch = endpoint.match(/[?&]action=([^&]+)/);
    if (actionMatch) {
      return `${cleanBase}?action=${actionMatch[1]}`;
    }
    if (endpoint.includes('register')) return `${cleanBase}?action=register`;
    if (endpoint.includes('login')) return `${cleanBase}?action=login`;
    if (endpoint.includes('approve-user') || endpoint.includes('approve_user')) return `${cleanBase}?action=approve_user`;
    if (endpoint.includes('admin/users') || endpoint.includes('admin_users')) return `${cleanBase}?action=admin_users`;
    if (endpoint.includes('library')) return `${cleanBase}?action=library`;
    if (endpoint.includes('songs')) return `${cleanBase}?action=songs`;
    if (endpoint.includes('directors')) return `${cleanBase}?action=directors`;
    if (endpoint.includes('test_db')) return `${cleanBase}?action=test_db`;
    if (endpoint.startsWith('?')) return `${cleanBase}${endpoint}`;
    return cleanBase;
  }

  // If base points to localhost:40 XAMPP backend directory (/dobbhypay/backend/api)
  if (cleanBase.includes('/dobbhypay/backend/api') || cleanBase.includes(':40/')) {
    if (endpoint.includes('register')) return `${cleanBase}/api.php?action=register`;
    if (endpoint.includes('login')) return `${cleanBase}/api.php?action=login`;
    if (endpoint.includes('library')) return `${cleanBase}/api.php?action=library`;
    if (endpoint.includes('songs')) return `${cleanBase}/api.php?action=songs`;
    if (endpoint.includes('directors')) return `${cleanBase}/api.php?action=directors`;
    if (endpoint.includes('approve_user') || endpoint.includes('approve-user')) return `${cleanBase}/api.php?action=approve_user`;
    if (endpoint.includes('admin/users') || endpoint.includes('admin_users')) return `${cleanBase}/api.php?action=admin_users`;
    if (endpoint.includes('test_db')) return `${cleanBase}/api.php?action=test_db`;
    if (endpoint.includes('upi')) return `${cleanBase}/upi.php`;
    if (endpoint.includes('payments')) return `${cleanBase}/payments.php`;
    if (endpoint.includes('clients')) return `${cleanBase}/clients.php`;
    if (endpoint.includes('invoices')) return `${cleanBase}/invoices.php`;
  }

  // If endpoint is already a query string like ?action=register
  if (endpoint.startsWith('?')) {
    if (cleanBase.endsWith('/api') || cleanBase === '/api') {
      // Express compatibility router: /api?action=register (legacy) — prefer REST paths instead
      return `${cleanBase}${endpoint}`;
    }
    return `${cleanBase}/api.php${endpoint}`;
  }

  // Avoid /api/api/... when base is already /api
  let path = endpoint.replace(/^\/+/, '');
  if ((cleanBase === '/api' || cleanBase.endsWith('/api')) && path.startsWith('api/')) {
    path = path.slice(4);
  }

  return `${cleanBase}/${path}`;
}

/**
 * Standard HTTP API Request Handler:
 * - Direct HTTP POST/GET via CapacitorHttp on Native Android and standard fetch on Web.
 * - Detects and cleanly rejects HTML security challenges (e.g. InfinityFree aes.js or Cloudflare HTML challenge)
 *   without attempting to bypass the hosting provider's security layer.
 * - Explicitly handles network errors, timeouts, and non-JSON responses.
 */
export async function apiFetch(endpoint, options = {}) {
  const base = getApiBase();
  let url = resolveApiUrl(base, endpoint);

  // In local development browser, route InfinityFree through Vite proxy to eliminate CORS errors
  if (isLocalBrowser && url.includes('dobbypay.infinityfreeapp.com')) {
    url = url.replace('https://dobbypay.infinityfreeapp.com', '/infinityfree-api');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  // 1. Native Android execution via CapacitorHttp
  if (isNativeApp) {
    try {
      const method = (options.method || 'GET').toUpperCase();
      let data = undefined;
      if (options.body) {
        data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      }

      const res = await (method === 'POST'
        ? CapacitorHttp.post({ url, headers, data })
        : CapacitorHttp.get({ url, headers }));

      const rawData = res.data;

      // Detection of hosting security challenge (e.g. InfinityFree /aes.js or HTML challenge)
      if (
        typeof rawData === 'string' &&
        (rawData.includes('aes.js') || rawData.includes('slowAES') || rawData.trim().startsWith('<'))
      ) {
        const errorMsg = 'Hosting security layer blocked API request with an HTML challenge. Direct API requests are not supported by this hosting provider.';
        console.error(`[API Security Intercept] ${url}:`, errorMsg);
        return {
          ok: false,
          status: 403,
          isHtmlChallenge: true,
          error: errorMsg,
          json: async () => ({ success: false, status: false, error: errorMsg, isHtmlChallenge: true })
        };
      }

      let parsed = rawData;
      if (typeof rawData === 'string') {
        try {
          parsed = JSON.parse(rawData);
        } catch {
          const errorMsg = `Invalid JSON response from server (${res.status}): ${rawData.slice(0, 100)}`;
          return {
            ok: false,
            status: res.status,
            error: errorMsg,
            json: async () => ({ success: false, status: false, error: errorMsg, raw: rawData })
          };
        }
      }

      const isOk = res.status >= 200 && res.status < 300 && parsed && parsed.success !== false && parsed.status !== false;
      return {
        ok: isOk,
        status: res.status,
        json: async () => parsed
      };
    } catch (e) {
      console.warn(`[CapacitorHttp Error] ${url}:`, e.message);
      return {
        ok: false,
        status: 0,
        error: `Network error: ${e.message}`,
        json: async () => ({ success: false, status: false, error: e.message })
      };
    }
  }

  // 2. Web Browser execution via standard fetch
  try {
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();

    // Check for HTML security challenge responses
    if (
      text.includes('aes.js') ||
      text.includes('slowAES') ||
      text.trim().startsWith('<!DOCTYPE') ||
      text.trim().startsWith('<html')
    ) {
      const errorMsg = 'Hosting security layer blocked API request with an HTML challenge. Direct API requests are not supported by this hosting provider.';
      console.error(`[API Security Intercept] ${url}:`, errorMsg);
      return {
        ok: false,
        status: 403,
        isHtmlChallenge: true,
        error: errorMsg,
        json: async () => ({ success: false, status: false, error: errorMsg, isHtmlChallenge: true })
      };
    }

    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const errorMsg = `Invalid JSON received from ${url}: ${text.slice(0, 100)}`;
      return {
        ok: false,
        status: res.status,
        error: errorMsg,
        json: async () => ({ success: false, status: false, error: errorMsg, raw: text })
      };
    }

    const isOk = res.ok && parsed && parsed.success !== false && parsed.status !== false;
    return {
      ok: isOk,
      status: res.status,
      json: async () => parsed
    };
  } catch (netErr) {
    const errorMsg = `Network error connecting to ${url}: ${netErr.message}`;
    console.error(`[API Network Error] ${errorMsg}`);
    return {
      ok: false,
      status: 0,
      error: errorMsg,
      json: async () => ({ success: false, status: false, error: errorMsg })
    };
  }
}

/**
 * Express-only auth URLs (MySQL via server/index.js — no PHP).
 * Web:  /api/login , /api/register  (Vite proxies → :5000)
 * APK:  http://10.0.2.2:5000/api/login  (or LAN IP override)
 */
function expressAuthUrls(kind) {
  const paths =
    kind === 'register'
      ? ['/api/register', '/api/auth/register']
      : ['/api/login', '/api/auth/login'];

  const urls = [];
  const base = getApiBase(); // usually "/api" or "http://host:5000/api"

  for (const fullPath of paths) {
    if (base === '/api' || !base) {
      urls.push(fullPath);
      continue;
    }
    // base ends with /api → append /login or /register
    const suffix = fullPath.replace(/^\/api/, ''); // /login or /auth/login
    if (base.endsWith('/api')) {
      urls.push(`${base}${suffix}`);
    } else {
      urls.push(`${base.replace(/\/+$/, '')}${fullPath}`);
    }
  }

  if (isLocalBrowser) {
    urls.push(...paths);
  }

  return [...new Set(urls)];
}

async function postExpressJson(url, payload) {
  if (isNativeApp) {
    const res = await CapacitorHttp.post({
      url,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      data: payload
    });
    const data = typeof res.data === 'string' ? JSON.parse(res.data || '{}') : (res.data || {});
    return { status: res.status || 0, data, ok: res.status >= 200 && res.status < 300 };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, ok: res.ok };
}

/**
 * Register → Express → MySQL `users` table (no PHP).
 */
export async function registerUser({ username, email, password, fullName, phone }) {
  const cleanUsername = (username || fullName || 'User').trim();
  const cleanEmail = (email || `${cleanUsername.toLowerCase()}@dobbypay.com`).trim().toLowerCase();
  const cleanFullName = (fullName || cleanUsername).trim();

  const payload = {
    username: cleanUsername,
    full_name: cleanFullName,
    email: cleanEmail,
    password: password || 'password123',
    phone: phone || null
  };

  let lastError = null;
  for (const url of expressAuthUrls('register')) {
    try {
      const { status, data, ok } = await postExpressJson(url, payload);
      if (ok && (data.success || data.status)) {
        return {
          success: true,
          pendingApproval: !!data.pendingApproval && !data.autoApproved,
          autoApproved: !!data.autoApproved,
          user: data.user,
          message: data.message || 'Registration saved to MySQL.'
        };
      }
      if (status === 409 || status === 400) {
        return {
          success: false,
          alreadyExists: status === 409,
          error: data.error || data.message || (status === 409 ? 'Email or username is already registered' : 'Registration failed')
        };
      }
      lastError = data.error || data.message || `HTTP ${status} from ${url}`;
    } catch (err) {
      lastError = `Network error ${url}: ${err.message}`;
    }
  }

  return {
    success: false,
    error: lastError || 'Registration failed. Start Express (`npm run server`) on port 5000.'
  };
}

/**
 * Login → Express → MySQL `users` validate (no PHP).
 */
export async function loginUser({ identifier, password }) {
  const cleanId = (identifier || '').trim();
  const cleanPass = (password || '').trim();

  if (!cleanId || !cleanPass) {
    return { success: false, error: 'Username/Email and Password are required' };
  }

  const payload = { identifier: cleanId, email: cleanId, password: cleanPass };
  let lastError = null;

  for (const url of expressAuthUrls('login')) {
    try {
      const { status, data, ok } = await postExpressJson(url, payload);

      if (ok && (data.success || data.status)) {
        const u = data.user || data;
        localStorage.setItem('dobbypay_current_user', JSON.stringify(u));
        return { success: true, user: u, transactions: data.transactions || [] };
      }

      if (status === 403 || data.notApproved || data.suspended) {
        return {
          success: false,
          notApproved: true,
          suspended: !!data.suspended || data.user?.status === 'suspended',
          reactivationRequested: !!data.reactivationRequested || Number(data.user?.reactivation_requested) === 1,
          error: data.message || data.error || 'Your account is awaiting admin approval.',
          user: data.user || { email: cleanId, name: cleanId, role: 'client' },
          adminWhatsApp: data.adminWhatsApp || '+918270006116'
        };
      }

      if (status === 401 || status === 404) {
        return {
          success: false,
          userNotFound: status === 404,
          wrongPassword: status === 401,
          error: data.error || data.message || 'Invalid username/email or password'
        };
      }

      lastError = data.error || data.message || `HTTP ${status} from ${url}`;
    } catch (err) {
      lastError = `Network error ${url}: ${err.message}`;
      clearDeadApiOverride(err.message || lastError);
    }
  }

  return {
    success: false,
    error: lastError || 'Login failed. Start Express (`npm run server`) — POST /api/login checks MySQL.'
  };
}

export function getCurrentUser() {
  try {
    const saved = localStorage.getItem('dobbypay_current_user');
    if (saved) {
      const u = JSON.parse(saved);
      const role = String(u.role || 'client').toLowerCase();
      const isAdminOrSuper = (role === 'admin' || role === 'super_admin');
      const isApproved = (Number(u.admin_approved) === 1 && Number(u.superadmin_approved) === 1 && u.status === 'active');
      if (isAdminOrSuper || isApproved || u.status === 'active' || u.is_offline_login) {
        return u;
      }
      localStorage.removeItem('dobbypay_current_user');
    }
  } catch (_) { }
  return null;
}

/**
 * Update (or create) the on-device profile shown in Settings / sidebar.
 * Works offline — persists to localStorage for web + Capacitor APK.
 */
export function updateCurrentUserProfile(updates = {}) {
  let current = null;
  try {
    const saved = localStorage.getItem('dobbypay_current_user');
    if (saved) current = JSON.parse(saved);
  } catch (_) {
    current = null;
  }

  const next = {
    id: current?.id || `local-${Date.now()}`,
    role: current?.role || 'client',
    is_offline_login: current?.is_offline_login !== false,
    admin_approved: current?.admin_approved ?? 1,
    superadmin_approved: current?.superadmin_approved ?? 1,
    status: current?.status || 'active',
    ...(current || {}),
    name: String(updates.name ?? current?.name ?? 'Guest').trim() || 'Guest',
    username: String(updates.username ?? current?.username ?? 'guest').trim().replace(/\s+/g, '_') || 'guest',
    email: String(updates.email ?? current?.email ?? '').trim(),
    phone: String(updates.phone ?? current?.phone ?? '').trim(),
    updatedAt: new Date().toISOString(),
  };

  if (Object.prototype.hasOwnProperty.call(updates, 'avatarUrl')) {
    next.avatarUrl = updates.avatarUrl || '';
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'coverUrl')) {
    next.coverUrl = updates.coverUrl || '';
  }

  localStorage.setItem('dobbypay_current_user', JSON.stringify(next));
  return next;
}

export function logoutUser() {
  localStorage.removeItem('dobbypay_current_user');
}

/**
 * Fetch all users from MySQL database for Admin/Super Admin inspection
 */
export async function fetchAdminUsers() {
  const base = getApiBase();
  const candidateEndpoints = base.endsWith('.php') || base.includes('dobbhypay/backend')
    ? ['?action=admin_users']
    : ['admin/users'];

  for (const ep of candidateEndpoints) {
    try {
      const res = await apiFetch(ep);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.users && Array.isArray(data.users)) {
          return data.users;
        }
      }
    } catch (_) {}
  }

  // Express fallback via Vite proxy
  if (isLocalBrowser) {
    try {
      const res = await fetch('/api/admin/users', { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.users)) return data.users;
      }
    } catch (_) {}
  }
  return [];
}

/**
 * Admin / Super Admin: Approve customer in MySQL & trigger notification email
 * action: 'admin_approve' (stage 1) | 'super_approve' (full activate)
 */
export async function approveUserAndSendEmail(userId, approvedBy = 'Super Admin', action) {
  const resolvedAction =
    action ||
    (String(approvedBy).toLowerCase().includes('super') ? 'super_approve' : 'admin_approve');

  const base = getApiBase();
  const candidateEndpoints = base.endsWith('.php') || base.includes('dobbhypay/backend')
    ? ['?action=approve_user']
    : ['admin/approve-user'];

  const body = { userId, approvedBy, action: resolvedAction };

  for (const ep of candidateEndpoints) {
    try {
      const res = await apiFetch(ep, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      if (res && res.ok) {
        const data = await res.json();
        if (data && (data.success || data.status)) {
          return {
            success: true,
            message: data.message || 'User approved successfully!',
            emailStatus: data.emailStatus,
            user: data.user
          };
        }
      }
    } catch (_) {}
  }

  if (isLocalBrowser) {
    const res = await fetch('/api/admin/approve-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.success || data.status)) {
      return {
        success: true,
        message: data.message || 'User approved successfully!',
        emailStatus: data.emailStatus,
        user: data.user
      };
    }
  }

  throw new Error('Failed to approve user on server');
}

/**
 * Suspended customer: request Super Admin to reactivate account
 */
export async function requestAccountReactivation(identifierOrUser) {
  const body =
    typeof identifierOrUser === 'object' && identifierOrUser
      ? {
          userId: identifierOrUser.id,
          identifier: identifierOrUser.email || identifierOrUser.name || identifierOrUser.username
        }
      : { identifier: String(identifierOrUser || '').trim() };

  if (!body.userId && !body.identifier) {
    throw new Error('Email or username is required');
  }

  const tryUrls = ['/api/auth/request-reactivation', '/api/request-reactivation'];
  for (const url of tryUrls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) return data;
      if (data.error) throw new Error(data.error);
    } catch (err) {
      if (err.message && !err.message.includes('Failed to fetch')) throw err;
    }
  }
  throw new Error('Could not send reactivation request');
}
