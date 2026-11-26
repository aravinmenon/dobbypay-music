import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool, { initDatabase, isDatabaseOnline, startDbReconnectLoop, getStaffLoginHints } from './db.js';
import { registerSaavnRoutes } from './saavnProxy.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendCustomerApprovalEmail, sendCustomEmail } from './emailService.js';
import { readLibrary, writeLibrary } from './library.js';
import {
  notifyAdminNewRegistration,
  notifyUserApproval,
  getAdminWhatsAppPhone,
} from './whatsappService.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');

const app = express();
const PORT = process.env.PORT || 5000;

// Whitelist authorized frontend origins
const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost',
  'capacitor://localhost',
  'https://localhost'
];

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : defaultOrigins;

// Open CORS for mobile APK (Capacitor) + web; auth still validates against Clever Cloud MySQL
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes('*') ||
      allowedOrigins.indexOf(origin) !== -1 ||
      origin.startsWith('capacitor://') ||
      origin.startsWith('ionic://') ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('https://localhost') ||
      origin.includes('trycloudflare.com') ||
      origin.includes('loca.lt') ||
      origin.includes('onrender.com')
    ) {
      return callback(null, true);
    }
    // Allow unknown mobile/webview origins so real-device APK can call the public API
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Bypass-Tunnel-Reminder']
}));

app.use(express.json());

registerSaavnRoutes(app);

// MySQL connection initialization (+ offline Admin/Super Admin fallback + reconnect)
initDatabase()
  .then(() => {
    if (!isDatabaseOnline()) {
      console.warn('⚠️ Clever Cloud MySQL offline — Admin/Super Admin login uses local fallback accounts.');
      console.warn('   Staff:', JSON.stringify(getStaffLoginHints()));
      startDbReconnectLoop();
    }
  })
  .catch((err) => {
    console.warn('MySQL unavailable (catalog API disabled):', err.message);
    startDbReconnectLoop();
  });

app.get(['/api', '/api/'], (_req, res) => {
  res.json({
    success: true,
    status: true,
    name: 'DobbyPay Music Express API',
    web: 'https://dobbypay-music.onrender.com/',
    mysql: isDatabaseOnline(),
    mode: isDatabaseOnline() ? 'clever-cloud-mysql' : 'offline-staff-fallback',
    endpoints: {
      health: 'GET /api/health',
      songs: 'GET /api/songs',
      directors: 'GET /api/directors',
      login: 'POST /api/auth/login',
      register: 'POST /api/auth/register',
      library: 'GET|PUT /api/library',
      adminUsers: 'GET /api/admin/users',
      approveUser: 'POST /api/admin/approve-user',
      walletTip: 'POST /api/wallet/tip',
      walletTopup: 'POST /api/wallet/topup',
    },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    mysql: isDatabaseOnline(),
    mode: isDatabaseOnline() ? 'clever-cloud-mysql' : 'offline-staff-fallback',
    staffLogins: isDatabaseOnline() ? undefined : getStaffLoginHints(),
  });
});

// ─── GET /api/stats ─────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  try {
    const [songRows] = await pool.query('SELECT COUNT(*) as songCount FROM songs');
    const [dirRows] = await pool.query('SELECT COUNT(*) as dirCount FROM directors');
    res.json({
      status: 'active',
      database: process.env.DB_NAME || 'dobbyppay',
      port: process.env.DB_PORT || '3310',
      totalSongs: songRows[0]?.songCount || 0,
      totalDirectors: dirRows[0]?.dirCount || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/songs (Smart Keyword Search & Pagination) ────────
app.get('/api/songs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { language, decade, category, director, search } = req.query;

    let whereConditions = [];
    let queryParams = [];

    if (language && language !== 'all') {
      whereConditions.push('language_id = ?');
      queryParams.push(language.toLowerCase());
    }

    if (decade && decade !== 'all') {
      whereConditions.push('decade = ?');
      queryParams.push(decade);
    }

    if (category && category !== 'all') {
      whereConditions.push('category = ?');
      queryParams.push(category);
    }

    if (director && director.trim()) {
      const cleanDirector = director.trim().replace(/\b(hit|songs|song|music|bgm)\b/gi, '').trim();
      whereConditions.push('director_name LIKE ?');
      queryParams.push(`%${cleanDirector}%`);
    }

    if (search && search.trim()) {
      // Strip common noise words: hit, songs, song, music, bgm
      const cleanSearch = search.trim().replace(/\b(hit|songs|song|music|bgm|theme|collection|full)\b/gi, '').trim();
      const searchTerm = cleanSearch || search.trim();
      
      const words = searchTerm.split(/\s+/).filter(w => w.length > 1);
      if (words.length > 0) {
        const wordConditions = words.map(() => `(title LIKE ? OR artist LIKE ? OR album LIKE ? OR director_name LIKE ?)`).join(' AND ');
        whereConditions.push(`(${wordConditions})`);
        
        words.forEach(w => {
          const pattern = `%${w}%`;
          queryParams.push(pattern, pattern, pattern, pattern);
        });
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Total Count Query
    const countSql = `SELECT COUNT(*) as total FROM songs ${whereClause}`;
    const [countResult] = await pool.query(countSql, queryParams);
    const totalSongs = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalSongs / limit) || 1;

    // Paginated Songs Query
    const songsSql = `
      SELECT 
        id, title, artist, director_name as director, album, 
        duration, duration_sec as durationSec, audio_url as audioUrl, 
        cover_url as coverUrl, genre, release_year as releaseYear, 
        decade, language_id as language, category, plays, color,
        COALESCE(provider, 'local') as provider,
        COALESCE(is_preview, 0) as isPreview,
        COALESCE(playback_type, 'full') as playbackType,
        COALESCE(license_note, 'Authorized Stream') as licenseNote,
        source_id as sourceId
      FROM songs 
      ${whereClause} 
      ORDER BY release_year DESC, id ASC 
      LIMIT ? OFFSET ?
    `;

    const [songs] = await pool.query(songsSql, [...queryParams, limit, offset]);

    res.json({
      success: true,
      songs,
      pagination: {
        currentPage: page,
        totalPages,
        totalSongs,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    console.error('API /api/songs error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/songs/:id (Fetch Single Song with Full Audio Stream) ──
app.get('/api/songs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT 
        id, title, artist, director_name as director, album, 
        duration, duration_sec as durationSec, audio_url as audioUrl, 
        cover_url as coverUrl, genre, release_year as releaseYear, 
        decade, language_id as language, category, plays, color,
        COALESCE(provider, 'local') as provider,
        COALESCE(is_preview, 0) as isPreview,
        COALESCE(playback_type, 'full') as playbackType,
        COALESCE(license_note, 'Authorized Stream') as licenseNote,
        source_id as sourceId
      FROM songs 
      WHERE id = ? OR title = ?
      LIMIT 1
    `, [id, id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Song not found in MySQL database' });
    }

    res.json({ success: true, song: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/directors ──────────────────────────────────────────
app.get('/api/directors', async (req, res) => {
  try {
    const { language } = req.query;
    let sql = `SELECT id, name, language_id as language, tagline, cover_url as coverUrl, color, bio FROM directors`;
    let params = [];

    if (language && language !== 'all') {
      sql += ` WHERE language_id = ?`;
      params.push(language.toLowerCase());
    }

    const [directors] = await pool.query(sql, params);
    res.json({ success: true, directors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/songs (Upsert Full Song to MySQL) ────────────────
app.post('/api/songs', async (req, res) => {
  try {
    const {
      id, title, artist, director, album, duration, durationSec,
      audioUrl, coverUrl, genre, releaseYear, decade, language, category,
      provider, isPreview, playbackType, licenseNote, sourceId
    } = req.body;

    if (!title || !audioUrl) {
      return res.status(400).json({ success: false, error: 'Title and audioUrl are required' });
    }

    const songId = id || `song-${Date.now()}`;
    const year = parseInt(releaseYear) || 2024;
    const durSec = parseInt(durationSec) || 240;
    const isPrev = isPreview ? 1 : 0;
    const prov = provider || 'local';
    const pbType = playbackType || (isPrev ? 'preview' : 'full');
    const licNote = licenseNote || (isPrev ? '30s Preview' : 'Authorized Full Track');

    await pool.query(
      `INSERT INTO songs 
       (id, title, artist, director_name, album, duration, duration_sec, audio_url, cover_url, genre, release_year, decade, language_id, category, provider, is_preview, playback_type, license_note, source_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       title=?, artist=?, director_name=?, album=?, duration=?, duration_sec=?, audio_url=?, cover_url=?, genre=?, release_year=?, decade=?, language_id=?, category=?, provider=?, is_preview=?, playback_type=?, license_note=?, source_id=?`,
      [
        songId, title, artist || 'Unknown', director || 'Unknown', album || 'Single',
        duration || '4:00', durSec, audioUrl, coverUrl || '', genre || 'Indian Hit',
        year, decade || '2020s', (language || 'tamil').toLowerCase(), category || 'songs',
        prov, isPrev, pbType, licNote, sourceId || null,
        title, artist || 'Unknown', director || 'Unknown', album || 'Single',
        duration || '4:00', durSec, audioUrl, coverUrl || '', genre || 'Indian Hit',
        year, decade || '2020s', (language || 'tamil').toLowerCase(), category || 'songs',
        prov, isPrev, pbType, licNote, sourceId || null
      ]
    );

    res.json({ success: true, message: 'Song upserted successfully in MySQL database!', songId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DobbyPay Authentication & MySQL `users` Table Management ─────────
// Supports PHP bcrypt ($2y$/$2a$) and SHA-256 password hashing
const hashPasswordBcrypt = (pwd) => bcrypt.hashSync(String(pwd), 10);

function verifyPassword(pwd, hash) {
  if (!hash) return false;
  const strPwd = String(pwd);
  const strHash = String(hash);
  try {
    if (bcrypt.compareSync(strPwd, strHash)) return true;
  } catch (_) {}
  try {
    const hash2a = strHash.replace(/^\$2y\$/, '$2a$');
    if (bcrypt.compareSync(strPwd, hash2a)) return true;
  } catch (_) {}
  const sha = crypto.createHash('sha256').update(strPwd).digest('hex');
  if (strHash === sha || strHash === strPwd) return true;
  return false;
}


// ─── DobbyPay Authentication & MySQL `users` Handlers ──────────────────

// Shared Registration Logic
async function handleRegister(req, res) {
  try {
    const { username, email, password, full_name, name: rawName, phone } = req.body || {};
    const displayName = full_name || username || rawName;
    if (!displayName || !email || !password) {
      return res.status(400).json({ success: false, status: false, error: 'Name, email, and password are required' });
    }

    const name = String(displayName).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassHash = hashPasswordBcrypt(password);
    const cleanPhone = phone ? String(phone).trim() : null;

    // Check if user already exists in `users`
    const [existing] = await pool.query(
      'SELECT id, email, name FROM users WHERE LOWER(email) = ? OR LOWER(name) = ? LIMIT 1',
      [cleanEmail, name.toLowerCase()]
    );

    if (existing && existing.length > 0) {
      return res.status(409).json({ success: false, status: false, error: 'Email or name is already registered in DobbyPay' });
    }

    const autoApprove = String(process.env.AUTO_APPROVE_USERS || '').toLowerCase() === 'true';
    const status = autoApprove ? 'active' : 'pending';
    const approved = autoApprove ? 1 : 0;

    // Insert into Clever Cloud `users` table
    const [result] = await pool.query(
      `INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        avatar,
        phone,
        status,
        email_verified,
        admin_approved,
        superadmin_approved
      ) VALUES (?, ?, ?, 'client', NULL, ?, ?, 1, ?, ?)`,
      [name, cleanEmail, cleanPassHash, cleanPhone, status, approved, approved]
    );

    const userId = result.insertId;
    const upiId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}${userId}@dobbypay`;
    const accNumber = 'DP' + Math.floor(100000 + Math.random() * 900000);

    // Create DobbyPay UPI wallet account with $100.00 welcome bonus
    try {
      await pool.query(
        `INSERT INTO upi_accounts (
          user_id,
          bank_name,
          account_number,
          ifsc_code,
          account_holder,
          upi_id,
          upi_pin_hash,
          balance,
          is_primary
        ) VALUES (?, 'DobbyPay Digital Bank', ?, 'DOBBY001', ?, ?, '', 100.00, 1)`,
        [userId, accNumber, name, upiId]
      );

      const txnRef = 'TXN' + Date.now();
      await pool.query(
        `INSERT INTO upi_transactions (
          sender_upi_id,
          receiver_upi_id,
          sender_name,
          receiver_name,
          amount,
          txn_ref,
          status,
          note
        ) VALUES ('rewards@dobbypay', ?, 'DobbyPay Rewards', ?, 100.00, ?, 'SUCCESS', 'Spotify Clone Welcome Bonus')`,
        [upiId, name, txnRef]
      );
    } catch (upiErr) {
      console.warn('UPI wallet auto-init note:', upiErr.message);
    }

    const user = {
      id: userId,
      name,
      username: name,
      email: cleanEmail,
      role: 'client',
      phone: cleanPhone,
      status,
      admin_approved: approved,
      superadmin_approved: approved,
      wallet_balance: 100.00,
      upi_id: upiId,
      reward_points: 500,
      vip_status: autoApprove
    };

    // Auto WhatsApp to Admin on every new registration (API send and/or wa.me link)
    let whatsapp = null;
    try {
      whatsapp = await notifyAdminNewRegistration(user);
    } catch (waErr) {
      console.warn('WhatsApp register notify note:', waErr.message);
    }

    return res.status(201).json({
      success: true,
      status: true,
      autoApproved: autoApprove,
      pendingApproval: !autoApprove,
      message: autoApprove
        ? 'Registration saved to MySQL. You can sign in now.'
        : 'Registration successful! WhatsApp approval request prepared for Admin. Pending Admin & Super Admin approval before you can log in.',
      user,
      adminWhatsApp: `+${getAdminWhatsAppPhone()}`,
      whatsappUrl: whatsapp?.whatsappUrl || null,
      whatsappSent: Boolean(whatsapp?.sent),
      whatsappStatus: whatsapp || null,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, status: false, error: err.message });
  }
}

// Shared Login Logic
async function handleLogin(req, res) {
  try {
    const { identifier, email, username, password } = req.body || {};
    const loginIdent = identifier || email || username;
    if (!loginIdent || !password) {
      return res.status(400).json({ success: false, status: false, error: 'Email/username and password are required' });
    }

    const cleanIdent = String(loginIdent).trim().toLowerCase();

    // Query `users` table
    const [rows] = await pool.query(
      `SELECT id, name, email, password_hash, role, avatar, phone, status, email_verified, admin_approved, superadmin_approved
       FROM users
       WHERE LOWER(email) = ? OR LOWER(name) = ? LIMIT 1`,
      [cleanIdent, cleanIdent]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, status: false, error: 'Invalid username/email or password' });
    }

    const userRow = rows[0];
    if (!verifyPassword(password, userRow.password_hash)) {
      return res.status(401).json({ success: false, status: false, error: 'Invalid username/email or password' });
    }

    const role = String(userRow.role || 'client').toLowerCase();
    const isAdminOrSuper = (role === 'admin' || role === 'super_admin');
    const isSuspended = String(userRow.status || '').toLowerCase() === 'suspended';
    const isApproved = (Number(userRow.admin_approved) === 1 && Number(userRow.superadmin_approved) === 1 && userRow.status === 'active');

    if (!isAdminOrSuper && isSuspended) {
      let reactivationRequested = 0;
      try {
        const [extra] = await pool.query(
          'SELECT reactivation_requested FROM users WHERE id = ? LIMIT 1',
          [userRow.id]
        );
        reactivationRequested = Number(extra?.[0]?.reactivation_requested) === 1 ? 1 : 0;
      } catch (_) {}

      return res.status(403).json({
        success: false,
        status: false,
        suspended: true,
        notApproved: true,
        reactivationRequested,
        error: reactivationRequested
          ? 'Account suspended. Your reactivation request is waiting for Super Admin.'
          : 'Account suspended by Super Admin. Likes, payments and login are blocked until reactivated.',
        user: {
          id: userRow.id,
          name: userRow.name,
          username: userRow.name,
          email: userRow.email,
          role: userRow.role,
          status: 'suspended',
          admin_approved: userRow.admin_approved,
          superadmin_approved: userRow.superadmin_approved,
          reactivation_requested: reactivationRequested,
          phone: userRow.phone
        },
        adminWhatsApp: process.env.ADMIN_WHATSAPP || '+919597072006'
      });
    }

    if (!isAdminOrSuper && !isApproved) {
      return res.status(403).json({
        success: false,
        status: false,
        notApproved: true,
        error: 'Account Pending Admin / Super Admin Approval. Your account must be approved before you can access DobbyPay Music.',
        user: {
          id: userRow.id,
          name: userRow.name,
          username: userRow.name,
          email: userRow.email,
          role: userRow.role,
          status: userRow.status || 'pending',
          admin_approved: userRow.admin_approved,
          superadmin_approved: userRow.superadmin_approved,
          phone: userRow.phone
        },
        adminWhatsApp: process.env.ADMIN_WHATSAPP || '+919597072006'
      });
    }

    // Retrieve UPI account and wallet balance
    let walletBalance = 100.00;
    let upiId = `${userRow.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@dobbypay`;

    try {
      const [upiRows] = await pool.query(
        `SELECT id, balance, upi_id FROM upi_accounts WHERE user_id = ? ORDER BY is_primary DESC, id ASC LIMIT 1`,
        [userRow.id]
      );

      if (upiRows && upiRows.length > 0) {
        walletBalance = parseFloat(upiRows[0].balance) || 0;
        if (upiRows[0].upi_id) upiId = upiRows[0].upi_id;
      } else {
        const accNumber = 'DP' + Math.floor(100000 + Math.random() * 900000);
        await pool.query(
          `INSERT INTO upi_accounts (user_id, bank_name, account_number, ifsc_code, account_holder, upi_id, upi_pin_hash, balance, is_primary)
           VALUES (?, 'DobbyPay Digital Bank', ?, 'DOBBY001', ?, ?, '', 100.00, 1)`,
          [userRow.id, accNumber, userRow.name, upiId]
        );
      }
    } catch (_) {}

    // Retrieve recent transactions
    let transactions = [];
    try {
      const [txRows] = await pool.query(
        `SELECT id, sender_upi_id, receiver_upi_id, sender_name, receiver_name, amount, txn_ref, status, note, created_at
         FROM upi_transactions
         WHERE receiver_upi_id = ? OR sender_upi_id = ?
         ORDER BY id DESC LIMIT 20`,
        [upiId, upiId]
      );
      transactions = txRows || [];
    } catch (_) {}

    const user = {
      id: userRow.id,
      name: userRow.name,
      username: userRow.name,
      email: userRow.email,
      role: userRow.role,
      avatar_url: userRow.avatar,
      phone: userRow.phone,
      status: userRow.status,
      admin_approved: userRow.admin_approved,
      superadmin_approved: userRow.superadmin_approved,
      wallet_balance: walletBalance,
      upi_id: upiId,
      reward_points: 500,
      vip_status: userRow.role === 'admin' || userRow.role === 'super_admin' || userRow.status === 'active'
    };

    return res.status(200).json({
      success: true,
      status: true,
      message: `Welcome back, ${user.name}!`,
      user,
      transactions
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, status: false, error: err.message });
  }
}

// Register endpoints
app.post('/api/auth/register', handleRegister);
app.post('/api/register', handleRegister);

// Login endpoints
app.post('/api/auth/login', handleLogin);
app.post('/api/login', handleLogin);

async function handleLibraryGet(req, res) {
  try {
    const userId = req.query.userId || req.body?.userId;
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });
    const library = await readLibrary(userId);
    return res.json({ success: true, library });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function handleLibrarySave(req, res) {
  try {
    const userId = req.body?.userId || req.query.userId;
    if (!userId) return res.status(400).json({ success: false, error: 'userId is required' });
    const account = await getUserAccountStatus(userId);
    if (account && !isCustomerAccountActive(account)) {
      return res.status(403).json({
        success: false,
        suspended: true,
        error: 'Account suspended. Liked songs sync is blocked until Super Admin reactivates your account.'
      });
    }
    const library = await writeLibrary(userId, req.body || {});
    return res.json({ success: true, library });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

app.get('/api/library', handleLibraryGet);
app.put('/api/library', handleLibrarySave);
app.post('/api/library', handleLibrarySave);

// Legacy action-based URL shim (old PHP paths) → Express handlers
app.all(['/backend/api/api.php', '/api.php', '/backend/api'], async (req, res) => {
  const action = req.query.action || req.body?.action;
  if (action === 'register') {
    return handleRegister(req, res);
  }
  if (action === 'login') {
    return handleLogin(req, res);
  }
  if (action === 'songs') {
    try {
      const [rows] = await pool.query('SELECT * FROM songs LIMIT 100');
      return res.json({ success: true, status: true, songs: rows || [] });
    } catch (err) {
      return res.status(500).json({ success: false, status: false, error: err.message });
    }
  }
  if (action === 'directors') {
    try {
      const [rows] = await pool.query('SELECT * FROM directors');
      return res.json({ success: true, status: true, directors: rows || [] });
    } catch (err) {
      return res.status(500).json({ success: false, status: false, error: err.message });
    }
  }
  if (action === 'library') {
    if (req.method === 'GET') return handleLibraryGet(req, res);
    return handleLibrarySave(req, res);
  }
  if (action === 'admin_users') {
    try {
      const [rows] = await pool.query('SELECT id, name, email, role, phone, status, admin_approved, superadmin_approved, created_at FROM users ORDER BY id DESC');
      return res.json({ success: true, status: true, users: rows || [] });
    } catch (err) {
      return res.status(500).json({ success: false, status: false, error: err.message });
    }
  }

  // API Health Check
  res.json({
    status: true,
    success: true,
    message: 'DobbyPay Music API is online and fully functional!',
    server: req.headers.host || 'localhost:5000',
    endpoints: {
      login: 'POST ?action=login or /api/auth/login',
      register: 'POST ?action=register or /api/auth/register',
      songs: 'GET ?action=songs or /api/songs',
      directors: 'GET ?action=directors or /api/directors',
      admin_users: 'GET ?action=admin_users or /api/admin/users'
    }
  });
});

// POST /api/wallet/tip
app.post('/api/wallet/tip', async (req, res) => {
  try {
    const { userId, amount, artist, trackTitle, note } = req.body;
    const tipAmt = parseFloat(amount);
    if (!tipAmt || tipAmt <= 0) {
      return res.status(400).json({ success: false, error: 'Valid tip amount required' });
    }

    const uid = userId || 1;
    const account = await getUserAccountStatus(uid);
    if (account && !isCustomerAccountActive(account)) {
      return res.status(403).json({
        success: false,
        suspended: true,
        error: 'Account suspended. Payments are blocked until Super Admin reactivates your account.'
      });
    }
    let newBal = 0;
    let upiId = 'user@dobbypay';

    try {
      const [upiRows] = await pool.query(
        'SELECT id, balance, upi_id, account_holder FROM upi_accounts WHERE user_id = ? ORDER BY is_primary DESC LIMIT 1',
        [uid]
      );

      if (upiRows && upiRows.length > 0) {
        const curBal = parseFloat(upiRows[0].balance) || 0;
        if (curBal < tipAmt) {
          return res.status(400).json({ success: false, error: 'Insufficient DobbyPay wallet balance' });
        }
        newBal = curBal - tipAmt;
        upiId = upiRows[0].upi_id;

        await pool.query('UPDATE upi_accounts SET balance = ? WHERE id = ?', [newBal, upiRows[0].id]);

        const txnRef = 'TIP' + Date.now();
        await pool.query(
          `INSERT INTO upi_transactions (sender_upi_id, receiver_upi_id, sender_name, receiver_name, amount, txn_ref, status, note)
           VALUES (?, 'artist@dobbypay', ?, ?, ?, ?, 'SUCCESS', ?)`,
          [upiId, upiRows[0].account_holder, artist || 'Artist', tipAmt, txnRef, note || `Tip for ${trackTitle}`]
        );
      }
    } catch (err) {
      console.warn('Tip transaction query note:', err.message);
    }

    res.json({
      success: true,
      message: `Tipped $${tipAmt.toFixed(2)} to ${artist}!`,
      balance: newBal,
      points: Math.round(tipAmt * 10)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/wallet/topup
app.post('/api/wallet/topup', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    const addAmt = parseFloat(amount);
    if (!addAmt || addAmt <= 0) {
      return res.status(400).json({ success: false, error: 'Valid top-up amount required' });
    }

    const uid = userId || 1;
    const account = await getUserAccountStatus(uid);
    if (account && !isCustomerAccountActive(account)) {
      return res.status(403).json({
        success: false,
        suspended: true,
        error: 'Account suspended. Wallet top-up is blocked until Super Admin reactivates your account.'
      });
    }
    let newBal = addAmt;

    try {
      const [upiRows] = await pool.query(
        'SELECT id, balance, upi_id, account_holder FROM upi_accounts WHERE user_id = ? ORDER BY is_primary DESC LIMIT 1',
        [uid]
      );

      if (upiRows && upiRows.length > 0) {
        newBal = (parseFloat(upiRows[0].balance) || 0) + addAmt;
        await pool.query('UPDATE upi_accounts SET balance = ? WHERE id = ?', [newBal, upiRows[0].id]);

        const txnRef = 'TOP' + Date.now();
        await pool.query(
          `INSERT INTO upi_transactions (sender_upi_id, receiver_upi_id, sender_name, receiver_name, amount, txn_ref, status, note)
           VALUES ('bank@dobbypay', ?, 'DobbyPay Bank', ?, ?, ?, 'SUCCESS', 'Wallet Top-Up')`,
          [upiRows[0].upi_id, upiRows[0].account_holder, addAmt, txnRef]
        );
      }
    } catch (err) {
      console.warn('Topup query note:', err.message);
    }

    res.json({
      success: true,
      message: `Added $${addAmt.toFixed(2)} to DobbyPay Wallet!`,
      balance: newBal
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/wallet/transactions
app.get('/api/wallet/transactions', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const [upiRows] = await pool.query(
      'SELECT upi_id FROM upi_accounts WHERE user_id = ? ORDER BY is_primary DESC LIMIT 1',
      [userId]
    );

    const upiId = upiRows && upiRows[0] ? upiRows[0].upi_id : '';
    const [rows] = await pool.query(
      `SELECT id, sender_upi_id, receiver_upi_id, sender_name, receiver_name, amount, txn_ref, status, note, created_at
       FROM upi_transactions
       WHERE receiver_upi_id = ? OR sender_upi_id = ?
       ORDER BY id DESC LIMIT 50`,
      [upiId, upiId]
    );

    res.json({ success: true, transactions: rows || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Super Admin User Management & Email Notification Endpoints ───────

async function getUserAccountStatus(userId) {
  const uid = Number(userId);
  if (!uid) return null;
  try {
    const [rows] = await pool.query(
      `SELECT id, role, status, admin_approved, superadmin_approved, reactivation_requested
       FROM users WHERE id = ? LIMIT 1`,
      [uid]
    );
    return rows?.[0] || null;
  } catch (_) {
    return null;
  }
}

function isCustomerAccountActive(userRow) {
  if (!userRow) return false;
  const role = String(userRow.role || '').toLowerCase();
  if (role === 'admin' || role === 'super_admin') return true;
  return (
    String(userRow.status) === 'active' &&
    Number(userRow.admin_approved) === 1 &&
    Number(userRow.superadmin_approved) === 1
  );
}

// GET /api/admin/users — Returns all users from MySQL with approval status
app.get('/api/admin/users', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, phone, status, email_verified, admin_approved, superadmin_approved,
              reactivation_requested, created_at
       FROM users
       ORDER BY id DESC`
    );
    res.json({ success: true, users: rows || [] });
  } catch (err) {
    // Fallback if reactivation_requested column is missing briefly
    try {
      const [rows] = await pool.query(
        `SELECT id, name, email, role, phone, status, email_verified, admin_approved, superadmin_approved, created_at
         FROM users ORDER BY id DESC`
      );
      res.json({
        success: true,
        users: (rows || []).map((u) => ({ ...u, reactivation_requested: 0 }))
      });
    } catch (err2) {
      res.status(500).json({ success: false, error: err2.message });
    }
  }
});

// POST /api/auth/request-reactivation — Suspended customer asks Super Admin to restore access
async function handleRequestReactivation(req, res) {
  try {
    const { identifier, email, username, userId } = req.body || {};
    let userRow = null;

    if (userId) {
      const [rows] = await pool.query(
        `SELECT id, name, email, role, status, reactivation_requested
         FROM users WHERE id = ? LIMIT 1`,
        [userId]
      );
      userRow = rows?.[0] || null;
    } else {
      const id = String(identifier || email || username || '').trim().toLowerCase();
      if (!id) {
        return res.status(400).json({ success: false, error: 'Email or username is required' });
      }
      const [rows] = await pool.query(
        `SELECT id, name, email, role, status, reactivation_requested
         FROM users WHERE LOWER(email) = ? OR LOWER(name) = ? LIMIT 1`,
        [id, id]
      );
      userRow = rows?.[0] || null;
    }

    if (!userRow) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }
    if (String(userRow.role).toLowerCase() === 'admin' || String(userRow.role).toLowerCase() === 'super_admin') {
      return res.status(400).json({ success: false, error: 'Staff accounts cannot request reactivation' });
    }
    if (String(userRow.status) !== 'suspended') {
      return res.status(400).json({
        success: false,
        error: `Account status is "${userRow.status}". Only suspended accounts can request reactivation.`
      });
    }

    await pool.query(
      `UPDATE users SET reactivation_requested = 1 WHERE id = ?`,
      [userRow.id]
    );

    console.log(`📨 Reactivation requested by ${userRow.email} (ID: ${userRow.id})`);

    res.json({
      success: true,
      message: 'Reactivation request sent to Super Admin. You will be able to log in after they activate your account again.',
      user: {
        id: userRow.id,
        name: userRow.name,
        email: userRow.email,
        status: 'suspended',
        reactivation_requested: 1
      },
      adminWhatsApp: process.env.ADMIN_WHATSAPP || '+919597072006'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

app.post('/api/auth/request-reactivation', handleRequestReactivation);
app.post('/api/request-reactivation', handleRequestReactivation);

// POST /api/admin/approve-user — Multi-stage approval (Admin & Super Admin) & HTML email dispatch
app.post('/api/admin/approve-user', async (req, res) => {
  try {
    const { userId, approvedBy = 'Admin', action = 'super_approve' } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    // 1. Fetch user from database
    const [userRows] = await pool.query(
      `SELECT id, name, email, role, status, admin_approved, superadmin_approved, reactivation_requested
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found in database' });
    }

    const targetUser = userRows[0];
    const targetRole = String(targetUser.role || '').toLowerCase();
    if ((action === 'deactivate' || action === 'suspend') && (targetRole === 'admin' || targetRole === 'super_admin')) {
      return res.status(400).json({ success: false, error: 'Cannot deactivate Admin / Super Admin accounts' });
    }

    let updateSql = '';
    let emailStage = 'super_approve';
    let defaultMsg = '';

    if (action === 'admin_approve') {
      updateSql = `UPDATE users SET admin_approved = 1 WHERE id = ?`;
      emailStage = 'admin_approve';
      defaultMsg = `User approved by Admin! Awaiting Super Admin activation. Email sent to ${targetUser.email}`;
    } else if (action === 'super_approve' || action === 'super_fast_approve') {
      updateSql = `UPDATE users SET admin_approved = 1, superadmin_approved = 1, status = 'active', reactivation_requested = 0 WHERE id = ?`;
      emailStage = 'super_approve';
      defaultMsg = `User fully activated by Super Admin! Confirmation email sent to ${targetUser.email}`;
    } else if (action === 'admin_reject' || action === 'super_reject') {
      const col = action === 'admin_reject' ? 'admin_approved' : 'superadmin_approved';
      updateSql = `UPDATE users SET ${col} = -1, status = 'suspended', reactivation_requested = 0 WHERE id = ?`;
      emailStage = action;
      defaultMsg = `User registration rejected. Status email sent to ${targetUser.email}`;
    } else if (action === 'deactivate' || action === 'suspend') {
      // Super Admin deactivates customer: blocks login, likes sync, payments
      updateSql = `UPDATE users SET status = 'suspended', reactivation_requested = 0 WHERE id = ?`;
      emailStage = 'super_reject';
      defaultMsg = `User ${targetUser.email} deactivated. Login, likes and payments are blocked until Super Admin reactivates.`;
    } else if (action === 'reactivate') {
      updateSql = `UPDATE users SET admin_approved = 1, superadmin_approved = 1, status = 'active', reactivation_requested = 0 WHERE id = ?`;
      emailStage = 'super_approve';
      defaultMsg = `User account reactivated. Notification email sent to ${targetUser.email}`;
    } else {
      updateSql = `UPDATE users SET admin_approved = 1, superadmin_approved = 1, status = 'active', reactivation_requested = 0 WHERE id = ?`;
      emailStage = 'super_approve';
      defaultMsg = `User approved and activated.`;
    }

    // 2. Update user status in MySQL
    await pool.query(updateSql, [userId]);
    console.log(`✅ [${action}] User in MySQL: ${targetUser.email} (ID: ${userId}) by ${approvedBy}`);

    // 3. Send approval notification email to customer
    const emailResult = await sendCustomerApprovalEmail({
      toEmail: targetUser.email,
      customerName: targetUser.name,
      role: targetUser.role || 'client',
      approvedBy,
      stage: emailStage
    });

    // 4. Auto WhatsApp to customer (phone) — or wa.me fallback for admin to open
    let whatsapp = null;
    try {
      const [freshRows] = await pool.query(
        `SELECT id, name, email, phone, role, status FROM users WHERE id = ? LIMIT 1`,
        [userId]
      );
      const freshUser = freshRows?.[0] || targetUser;
      whatsapp = await notifyUserApproval(freshUser, emailStage, approvedBy);
    } catch (waErr) {
      console.warn('WhatsApp approve notify note:', waErr.message);
    }

    res.json({
      success: true,
      message: defaultMsg,
      emailStatus: emailResult,
      action,
      whatsappUrl: whatsapp?.whatsappUrl || null,
      whatsappSent: Boolean(whatsapp?.sent),
      whatsappStatus: whatsapp || null,
    });
  } catch (err) {
    console.error('Approve user error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Support Chat (login / register screen only) ──────────────
const AUTH_CHAT_GREETING =
  '👋 Hello! Welcome to DobbyPay Music Support.\n\nPlease type your registered email or username so I can fetch your approval status.';

function extractLookupIdentifier(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) return emailMatch[0].trim();
  // Ignore pure greetings / short help words
  const lower = text.toLowerCase();
  if (/^(hi|hello|hey|help|status|approve|approval|whatsapp|ok|thanks|thank you)[.!?]*$/i.test(lower)) {
    return '';
  }
  // Treat a single token / short phrase as username
  if (!/\s/.test(text) || text.split(/\s+/).length <= 3) {
    return text.replace(/^["'`]+|["'`]+$/g, '').trim();
  }
  return '';
}

function buildApprovalStatusPayload(userRow) {
  const adminWa = String(process.env.ADMIN_WHATSAPP || '+919597072006').replace(/[^0-9]/g, '');
  if (!userRow) {
    return {
      found: false,
      statusLabel: 'Not Found',
      canLogin: false,
      reply:
        '❌ No account found for that email/username.\n\nPlease register first on the Create Account tab, then come back here with the same email/username.',
      whatsappUrl: null,
      adminWhatsApp: adminWa ? `+${adminWa}` : null
    };
  }

  const role = String(userRow.role || 'client').toLowerCase();
  const isStaff = role === 'admin' || role === 'super_admin';
  const adminOk = Number(userRow.admin_approved) === 1;
  const superOk = Number(userRow.superadmin_approved) === 1;
  const isSuspended = String(userRow.status) === 'suspended';
  const reactivationRequested = Number(userRow.reactivation_requested) === 1;
  const rejected =
    Number(userRow.admin_approved) === -1 ||
    Number(userRow.superadmin_approved) === -1;
  const canLogin = isStaff || (adminOk && superOk && userRow.status === 'active');

  let statusLabel = 'Pending';
  let stageLine = '';
  if (isStaff) {
    statusLabel = 'Staff Account (Active)';
    stageLine = 'Admin/Super Admin accounts can log in immediately.';
  } else if (isSuspended && reactivationRequested) {
    statusLabel = '⏸ Suspended — Reactivation Requested';
    stageLine = 'Your request is with Super Admin. Login, likes and payments stay blocked until they Activate again.';
  } else if (isSuspended) {
    statusLabel = '🚫 Suspended by Super Admin';
    stageLine = 'Login, likes and payments are blocked. Tap “Request Reactivation” or WhatsApp Admin.';
  } else if (rejected) {
    statusLabel = 'Rejected';
    stageLine = 'Your registration was rejected. Contact admin on WhatsApp to appeal.';
  } else if (!adminOk) {
    statusLabel = '⏳ Pending Admin Approval (Stage 1)';
    stageLine = 'Waiting for Admin to approve. After that, Super Admin must activate you.';
  } else if (!superOk) {
    statusLabel = '⏳ Awaiting Super Admin Activation (Stage 2)';
    stageLine = 'Admin already approved. Waiting for Super Admin final activation.';
  } else if (canLogin) {
    statusLabel = '✅ Approved & Active';
    stageLine = 'Both Admin and Super Admin approved. You can log in now.';
  } else {
    statusLabel = `Status: ${userRow.status || 'pending'}`;
    stageLine = 'Account exists but is not fully active yet.';
  }

  const waText = encodeURIComponent(
    `Hello Admin, please approve my DobbyPay Music account.\n\n` +
      `👤 Name: ${userRow.name || 'User'}\n` +
      `📧 Email: ${userRow.email || 'N/A'}\n` +
      `🆔 Username: ${userRow.name || 'N/A'}\n` +
      `🔢 User ID: ${userRow.id}\n` +
      `📌 Current status: ${statusLabel}\n` +
      `✔ Admin approved: ${adminOk ? 'YES' : 'NO'}\n` +
      `✔ Super Admin approved: ${superOk ? 'YES' : 'NO'}\n\n` +
      `Please approve so I can log in. Thank you!`
  );
  const whatsappUrl = adminWa ? `https://wa.me/${adminWa}?text=${waText}` : null;

  const reply =
    `📋 Account status for ${userRow.email || userRow.name}:\n\n` +
    `👤 Name: ${userRow.name || '—'}\n` +
    `📧 Email: ${userRow.email || '—'}\n` +
    `💼 Role: ${userRow.role || 'client'}\n` +
    `📌 Current status: ${statusLabel}\n` +
    `✔ Admin approved: ${adminOk || isStaff ? 'YES' : 'NO'}\n` +
    `✔ Super Admin approved: ${superOk || isStaff ? 'YES' : 'NO'}\n` +
    `🔓 Can login: ${canLogin ? 'YES' : 'NO'}\n\n` +
    `${stageLine}\n\n` +
    (canLogin
      ? 'You can close this chat and sign in with your password.'
      : 'Tap “Send WhatsApp Intimation” below to notify Admin for approval.');

  return {
    found: true,
    canLogin,
    suspended: isSuspended,
    reactivationRequested: isSuspended && reactivationRequested,
    canRequestReactivation: isSuspended && !reactivationRequested,
    statusLabel,
    user: {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      status: userRow.status,
      admin_approved: userRow.admin_approved,
      superadmin_approved: userRow.superadmin_approved,
      reactivation_requested: reactivationRequested ? 1 : 0
    },
    reply,
    whatsappUrl,
    adminWhatsApp: adminWa ? `+${adminWa}` : null
  };
}

async function lookupUserApprovalByIdentifier(identifier) {
  const clean = String(identifier || '').trim();
  if (!clean) return null;
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, phone, status, admin_approved, superadmin_approved, reactivation_requested, created_at
       FROM users
       WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?)
       LIMIT 1`,
      [clean, clean]
    );
    return rows?.[0] || null;
  } catch (_) {
    const [rows] = await pool.query(
      `SELECT id, name, email, role, phone, status, admin_approved, superadmin_approved, created_at
       FROM users
       WHERE LOWER(email) = LOWER(?) OR LOWER(name) = LOWER(?)
       LIMIT 1`,
      [clean, clean]
    );
    return rows?.[0] ? { ...rows[0], reactivation_requested: 0 } : null;
  }
}

app.post('/api/chat', async (req, res) => {
  try {
    const { action, session_id: sessionId, message, identifier } = req.body || {};
    if (!action) return res.status(400).json({ success: false, error: 'Invalid request' });
    const sid = String(sessionId || `chat_${Date.now()}`).slice(0, 64);

    if (action === 'get_status') {
      let enabled = true;
      try {
        const [rows] = await pool.query(
          "SELECT setting_value FROM system_settings WHERE setting_key = 'ai_bot_enabled' LIMIT 1"
        );
        if (rows?.[0] && String(rows[0].setting_value) === '0') enabled = false;
      } catch (_) {}
      return res.json({
        success: true,
        enabled,
        greeting: AUTH_CHAT_GREETING,
        adminWhatsApp: process.env.ADMIN_WHATSAPP || '+919597072006'
      });
    }

    if (action === 'load_history') {
      const [rows] = await pool.query(
        'SELECT sender, message, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT 100',
        [sid]
      );
      let messages = rows || [];
      if (messages.length === 0) {
        await pool.query(
          "INSERT INTO chat_messages (session_id, sender, message) VALUES (?, 'bot', ?)",
          [sid, AUTH_CHAT_GREETING]
        );
        messages = [{ sender: 'bot', message: AUTH_CHAT_GREETING, created_at: new Date() }];
      }
      return res.json({ success: true, messages });
    }

    if (action === 'lookup_status') {
      const id = String(identifier || message || '').trim();
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Please provide your registered email or username.'
        });
      }
      const userRow = await lookupUserApprovalByIdentifier(id);
      const payload = buildApprovalStatusPayload(userRow);
      await pool.query(
        "INSERT INTO chat_messages (session_id, sender, message) VALUES (?, 'bot', ?)",
        [sid, payload.reply]
      );
      return res.json({ success: true, ...payload });
    }

    if (action === 'send_message') {
      const msg = String(message || '').trim();
      if (!msg) return res.status(400).json({ success: false, error: 'Message cannot be empty' });
      if (msg.length > 2000) return res.status(400).json({ success: false, error: 'Message too long' });

      await pool.query(
        "INSERT INTO chat_messages (session_id, sender, message) VALUES (?, 'customer', ?)",
        [sid, msg]
      );

      const maybeId = extractLookupIdentifier(msg);
      if (maybeId) {
        const userRow = await lookupUserApprovalByIdentifier(maybeId);
        const payload = buildApprovalStatusPayload(userRow);
        await pool.query(
          "INSERT INTO chat_messages (session_id, sender, message) VALUES (?, 'bot', ?)",
          [sid, payload.reply]
        );
        return res.json({
          success: true,
          reply: payload.reply,
          status: payload,
          bot_enabled: true
        });
      }

      const lower = msg.toLowerCase();
      let reply = AUTH_CHAT_GREETING;
      if (/(whatsapp|wa\.me|intimation|notify admin|contact admin)/i.test(lower)) {
        reply =
          'Sure — first send your registered email or username. I will show your current approval status and a WhatsApp intimation button for Admin.';
      } else if (/(status|approve|approval|pending|login)/i.test(lower)) {
        reply =
          'To check approval status, please type your registered email or username (example: you@gmail.com).';
      } else if (/^(hi|hello|hey)\b/i.test(lower)) {
        reply = AUTH_CHAT_GREETING;
      } else {
        reply =
          'Please type your registered email or username so I can fetch and show your current Admin / Super Admin approval status.';
      }

      await pool.query(
        "INSERT INTO chat_messages (session_id, sender, message) VALUES (?, 'bot', ?)",
        [sid, reply]
      );
      return res.json({ success: true, reply, bot_enabled: true });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (err) {
    console.error('Chat API error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Listening analytics (Admin / Super Admin dashboards) ───────────────────
const inMemorySongPlays = [];

function normalizePlayPayload(body = {}) {
  const userId = parseInt(body.userId, 10);
  const songId = String(body.songId || body.id || '').trim().slice(0, 128);
  const songTitle = String(body.songTitle || body.title || 'Unknown').trim().slice(0, 255);
  const songArtist = String(body.songArtist || body.artist || '').trim().slice(0, 255);
  const coverUrl = body.coverUrl || body.cover || null;
  const listenSeconds = Math.max(0, Math.min(86400, Math.round(Number(body.listenSeconds) || 0)));
  const playCount = Math.max(1, Math.min(50, Math.round(Number(body.playCount) || 1)));
  return { userId, songId, songTitle, songArtist, coverUrl, listenSeconds, playCount };
}

function upsertMemoryPlay(payload) {
  const existing = inMemorySongPlays.find(
    (p) => p.user_id === payload.userId && p.song_id === payload.songId
  );
  if (existing) {
    existing.listen_seconds += payload.listenSeconds;
    existing.play_count += payload.playCount;
    existing.song_title = payload.songTitle || existing.song_title;
    existing.song_artist = payload.songArtist || existing.song_artist;
    existing.cover_url = payload.coverUrl || existing.cover_url;
    existing.last_played_at = new Date().toISOString();
    return existing;
  }
  const row = {
    id: inMemorySongPlays.length + 1,
    user_id: payload.userId,
    song_id: payload.songId,
    song_title: payload.songTitle,
    song_artist: payload.songArtist,
    cover_url: payload.coverUrl,
    listen_seconds: payload.listenSeconds,
    play_count: payload.playCount,
    last_played_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };
  inMemorySongPlays.push(row);
  return row;
}

async function handleRecordPlay(req, res) {
  try {
    const payload = normalizePlayPayload(req.body || {});
    if (!payload.userId || !payload.songId) {
      return res.status(400).json({ success: false, error: 'userId and songId are required' });
    }
    // Only count meaningful listen slices (>= 1s) as time; still bump play when playCount sent
    if (payload.listenSeconds < 1 && payload.playCount < 1) {
      return res.json({ success: true, skipped: true });
    }

    try {
      await pool.query(
        `INSERT INTO song_plays
          (user_id, song_id, song_title, song_artist, cover_url, listen_seconds, play_count)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           listen_seconds = listen_seconds + VALUES(listen_seconds),
           play_count = play_count + VALUES(play_count),
           song_title = VALUES(song_title),
           song_artist = VALUES(song_artist),
           cover_url = COALESCE(VALUES(cover_url), cover_url),
           last_played_at = CURRENT_TIMESTAMP`,
        [
          payload.userId,
          payload.songId,
          payload.songTitle,
          payload.songArtist,
          payload.coverUrl,
          payload.listenSeconds,
          payload.playCount
        ]
      );
    } catch (dbErr) {
      console.warn('song_plays MySQL upsert fallback:', dbErr.message);
      upsertMemoryPlay(payload);
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

function buildDashboardFromRows(playRows, userMap) {
  const bySong = new Map();
  const byUser = new Map();
  let totalPlays = 0;
  let totalListenSeconds = 0;

  for (const row of playRows) {
    const plays = Number(row.play_count) || 0;
    const secs = Number(row.listen_seconds) || 0;
    totalPlays += plays;
    totalListenSeconds += secs;

    const songKey = row.song_id;
    const songAgg = bySong.get(songKey) || {
      songId: row.song_id,
      title: row.song_title,
      artist: row.song_artist,
      coverUrl: row.cover_url,
      playCount: 0,
      listenSeconds: 0
    };
    songAgg.playCount += plays;
    songAgg.listenSeconds += secs;
    songAgg.title = row.song_title || songAgg.title;
    songAgg.artist = row.song_artist || songAgg.artist;
    songAgg.coverUrl = row.cover_url || songAgg.coverUrl;
    bySong.set(songKey, songAgg);

    const uid = Number(row.user_id);
    const userInfo = userMap.get(uid) || {};
    const userAgg = byUser.get(uid) || {
      userId: uid,
      name: userInfo.name || `User #${uid}`,
      email: userInfo.email || '',
      playCount: 0,
      listenSeconds: 0,
      uniqueSongs: 0
    };
    userAgg.playCount += plays;
    userAgg.listenSeconds += secs;
    userAgg.uniqueSongs += 1;
    byUser.set(uid, userAgg);
  }

  const topSongs = [...bySong.values()]
    .sort((a, b) => b.playCount - a.playCount || b.listenSeconds - a.listenSeconds)
    .slice(0, 15);
  const topListeners = [...byUser.values()]
    .sort((a, b) => b.listenSeconds - a.listenSeconds || b.playCount - a.playCount)
    .slice(0, 15);

  return {
    success: true,
    summary: {
      totalPlays,
      totalListenSeconds,
      uniqueListeners: byUser.size,
      uniqueSongs: bySong.size
    },
    topSongs,
    topListeners
  };
}

async function handleListeningDashboard(req, res) {
  try {
    let playRows = [];
    let userMap = new Map();

    try {
      const [rows] = await pool.query(
        `SELECT sp.user_id, sp.song_id, sp.song_title, sp.song_artist, sp.cover_url,
                sp.listen_seconds, sp.play_count, sp.last_played_at,
                u.name AS user_name, u.email AS user_email, u.role AS user_role
         FROM song_plays sp
         LEFT JOIN users u ON u.id = sp.user_id
         WHERE COALESCE(u.role, 'client') NOT IN ('admin', 'super_admin')
         ORDER BY sp.last_played_at DESC`
      );
      playRows = rows || [];
      for (const r of playRows) {
        userMap.set(Number(r.user_id), { name: r.user_name, email: r.user_email });
      }
    } catch (dbErr) {
      console.warn('listening-dashboard MySQL fallback:', dbErr.message);
      playRows = inMemorySongPlays.slice();
      try {
        const [users] = await pool.query(`SELECT id, name, email, role FROM users`);
        for (const u of users || []) {
          if (String(u.role).toLowerCase() === 'admin' || String(u.role).toLowerCase() === 'super_admin') continue;
          userMap.set(Number(u.id), { name: u.name, email: u.email });
        }
        playRows = playRows.filter((p) => userMap.has(Number(p.user_id)) || !p.user_id);
      } catch (_) {}
    }

    // If no analytics yet, return empty shaped payload (UI shows empty state)
    const dashboard = buildDashboardFromRows(playRows, userMap);
    return res.json(dashboard);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

app.post('/api/plays/record', handleRecordPlay);
app.post('/api/play/record', handleRecordPlay);
app.get('/api/admin/listening-dashboard', handleListeningDashboard);
app.get('/api/admin/play-dashboard', handleListeningDashboard);

// Serve Vite web build on Render (same service as /api/*)
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DobbyPay Music MySQL REST API Server running at http://0.0.0.0:${PORT}`);
});


