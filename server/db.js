import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

let pool = null;
let isMySQLAvailable = false;
const inMemorySongs = [];
const inMemoryDirectors = [];

function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

/** Offline fallback staff so Admin/Super Admin can still log in if Clever Cloud is blocked. */
const STAFF_SEED = [
  { id: 1, name: 'Admin', email: 'admin@dobbypay.com', role: 'admin', password: 'Admin@123' },
  { id: 2, name: 'Super Admin', email: 'superadmin@dobbypay.com', role: 'super_admin', password: 'Super@123' },
];

const inMemoryUsers = STAFF_SEED.map((s) => ({
  id: s.id,
  name: s.name,
  email: s.email,
  password_hash: sha256(s.password),
  role: s.role,
  avatar: null,
  phone: null,
  status: 'active',
  email_verified: 1,
  admin_approved: 1,
  superadmin_approved: 1,
  reactivation_requested: 0,
  created_at: new Date(),
}));

export function isDatabaseOnline() {
  return isMySQLAvailable;
}

export function getStaffLoginHints() {
  return STAFF_SEED.map(({ email, password, role }) => ({ email, password, role }));
}

let mysqlModule = null;
try {
  mysqlModule = await import('mysql2/promise');
} catch (err) {
  console.log('ℹ️ MySQL driver optional - Standalone Phone Storage Mode active.');
}

function resolveDbConfig(config = {}) {
  const host =
    config.host ||
    process.env.DB_HOST ||
    process.env.MYSQL_ADDON_HOST ||
    '127.0.0.1';
  const port = parseInt(
    config.port || process.env.DB_PORT || process.env.MYSQL_ADDON_PORT || '3310',
    10
  );
  const user =
    config.user ||
    process.env.DB_USER ||
    process.env.MYSQL_ADDON_USER ||
    'root';
  const password =
    config.password !== undefined
      ? config.password
      : (process.env.DB_PASS || process.env.MYSQL_ADDON_PASSWORD || '');
  const database =
    config.database ||
    process.env.DB_NAME ||
    process.env.MYSQL_ADDON_DB ||
    'dobbyppay';
  const sslFlag =
    config.ssl === true ||
    process.env.DB_SSL === 'true' ||
    String(host).includes('aivencloud.com') ||
    String(host).includes('clever-cloud.com');

  return { host, port, user, password, database, ssl: sslFlag };
}

async function createPoolWithConfig(config) {
  if (!mysqlModule) return null;
  const resolved = resolveDbConfig(config);
  const poolOpts = {
    host: resolved.host,
    port: resolved.port,
    user: resolved.user,
    password: resolved.password,
    database: resolved.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000,
  };
  if (resolved.ssl) {
    poolOpts.ssl = { rejectUnauthorized: false };
  }
  return mysqlModule.default.createPool(poolOpts);
}

// Try initial pool from environment variables (Clever Cloud / Aiven / local)
if (mysqlModule) {
  pool = await createPoolWithConfig({});
}

export async function initDatabase() {
  if (!mysqlModule) {
    console.log('📱 Phone Storage Mode: MySQL disabled. App runs 100% on device/local storage.');
    return;
  }
  let conn = null;
  try {
    if (pool) {
      conn = await pool.getConnection();
      isMySQLAvailable = true;
    }
  } catch (err) {
    console.warn(`Primary DB connection failed (${process.env.DB_HOST}:${process.env.DB_PORT}): ${err.message}. Trying local MySQL fallback...`);
    // Try local MySQL fallbacks (Port 3310 and 3306)
    const localConfigs = [
      { host: '127.0.0.1', port: 3310, user: 'root', password: '', database: 'dobbyppay' },
      { host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'dobbyppay' },
      { host: 'localhost', port: 3310, user: 'root', password: '', database: 'dobbyppay' }
    ];
    for (const cfg of localConfigs) {
      try {
        const fallbackPool = await createPoolWithConfig(cfg);
        conn = await fallbackPool.getConnection();
        pool = fallbackPool;
        isMySQLAvailable = true;
        console.log(`✅ Connected to local MySQL fallback at ${cfg.host}:${cfg.port} (${cfg.database})`);
        break;
      } catch (_) {}
    }
  }

  if (!conn) {
    isMySQLAvailable = false;
    console.log('📱 No MySQL server available. Running in Safe Phone Storage Mode.');
    return;
  }

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS languages (
        id VARCHAR(32) PRIMARY KEY,
        name VARCHAR(64) NOT NULL,
        icon VARCHAR(16),
        color VARCHAR(16)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS directors (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        language_id VARCHAR(32),
        tagline VARCHAR(255),
        cover_url TEXT,
        color VARCHAR(16),
        bio TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS songs (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        artist VARCHAR(255) NOT NULL,
        director_name VARCHAR(128),
        album VARCHAR(255),
        duration VARCHAR(16) DEFAULT '4:00',
        duration_sec INT NOT NULL DEFAULT 240,
        audio_url TEXT NOT NULL,
        cover_url TEXT,
        genre VARCHAR(64),
        release_year INT NOT NULL DEFAULT 2024,
        decade VARCHAR(16) NOT NULL DEFAULT '2020s',
        language_id VARCHAR(32) NOT NULL DEFAULT 'tamil',
        category VARCHAR(32) DEFAULT 'songs',
        plays VARCHAR(32) DEFAULT '100,000',
        color VARCHAR(16) DEFAULT '#FF6B00',
        provider VARCHAR(64) DEFAULT 'local',
        is_preview TINYINT(1) DEFAULT 0,
        playback_type VARCHAR(32) DEFAULT 'full',
        license_note VARCHAR(255) DEFAULT 'Authorized Stream',
        source_id VARCHAR(128) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try { await conn.query(`ALTER TABLE songs ADD COLUMN provider VARCHAR(64) DEFAULT 'local'`); } catch (_) {}
    try { await conn.query(`ALTER TABLE songs ADD COLUMN is_preview TINYINT(1) DEFAULT 0`); } catch (_) {}
    try { await conn.query(`ALTER TABLE songs ADD COLUMN playback_type VARCHAR(32) DEFAULT 'full'`); } catch (_) {}
    try { await conn.query(`ALTER TABLE songs ADD COLUMN license_note VARCHAR(255) DEFAULT 'Authorized Stream'`); } catch (_) {}
    try { await conn.query(`ALTER TABLE songs ADD COLUMN source_id VARCHAR(128) DEFAULT NULL`); } catch (_) {}

    await conn.query(`
      CREATE TABLE IF NOT EXISTS dobbypay_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(64) NOT NULL UNIQUE,
        email VARCHAR(128) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(128) DEFAULT '',
        wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 100.00,
        reward_points INT NOT NULL DEFAULT 500,
        vip_status TINYINT(1) NOT NULL DEFAULT 0,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Auth table used by /api/auth/register and /api/auth/login
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        email VARCHAR(128) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'client',
        avatar TEXT,
        phone VARCHAR(32) DEFAULT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        email_verified TINYINT(1) NOT NULL DEFAULT 0,
        admin_approved TINYINT(1) NOT NULL DEFAULT 0,
        superadmin_approved TINYINT(1) NOT NULL DEFAULT 0,
        reactivation_requested TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_users_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Existing DBs may predate reactivation_requested
    try {
      await conn.query(
        `ALTER TABLE users ADD COLUMN reactivation_requested TINYINT(1) NOT NULL DEFAULT 0`
      );
    } catch (_) {
      /* column already exists */
    }

    await conn.query(`
      CREATE TABLE IF NOT EXISTS upi_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        bank_name VARCHAR(128) DEFAULT 'DobbyPay Digital Bank',
        account_number VARCHAR(64) DEFAULT NULL,
        ifsc_code VARCHAR(32) DEFAULT NULL,
        account_holder VARCHAR(128) DEFAULT NULL,
        upi_id VARCHAR(128) NOT NULL,
        upi_pin_hash VARCHAR(255) DEFAULT '',
        balance DECIMAL(10,2) NOT NULL DEFAULT 100.00,
        is_primary TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_upi_user (user_id),
        INDEX idx_upi_id (upi_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS upi_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_upi_id VARCHAR(128),
        receiver_upi_id VARCHAR(128),
        sender_name VARCHAR(128),
        receiver_name VARCHAR(128),
        amount DECIMAL(10,2) NOT NULL,
        txn_ref VARCHAR(64),
        status VARCHAR(32) DEFAULT 'SUCCESS',
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_libraries (
        user_id VARCHAR(64) PRIMARY KEY,
        payload LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS dobbypay_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        type VARCHAR(32) NOT NULL,
        artist VARCHAR(128),
        track_title VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        sender ENUM('customer', 'bot', 'admin') NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_chat_session (session_id),
        INDEX idx_chat_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Per-user song listen analytics for Admin / Super Admin dashboards
    await conn.query(`
      CREATE TABLE IF NOT EXISTS song_plays (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        song_id VARCHAR(128) NOT NULL,
        song_title VARCHAR(255) NOT NULL DEFAULT '',
        song_artist VARCHAR(255) NOT NULL DEFAULT '',
        cover_url TEXT,
        listen_seconds INT NOT NULL DEFAULT 0,
        play_count INT NOT NULL DEFAULT 1,
        last_played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_song (user_id, song_id),
        INDEX idx_plays_user (user_id),
        INDEX idx_plays_song (song_id),
        INDEX idx_plays_last (last_played_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT,
        category VARCHAR(50) DEFAULT 'general',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed / repair Admin + Super Admin. Passwords: Admin@123 / Super@123
    const staff = [
      { name: 'Admin', email: 'admin@dobbypay.com', role: 'admin', password: 'Admin@123' },
      { name: 'Super Admin', email: 'superadmin@dobbypay.com', role: 'super_admin', password: 'Super@123' },
    ];
    for (const s of staff) {
      try {
        const hash = sha256(s.password);
        const [existing] = await conn.query(
          'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1',
          [s.email.toLowerCase()]
        );
        if (!existing || existing.length === 0) {
          await conn.query(
            `INSERT INTO users (
              name, email, password_hash, role, phone, status,
              email_verified, admin_approved, superadmin_approved
            ) VALUES (?, ?, ?, ?, NULL, 'active', 1, 1, 1)`,
            [s.name, s.email.toLowerCase(), hash, s.role]
          );
          console.log(`👤 Seeded ${s.role}: ${s.email}`);
        } else {
          // Keep staff passwords / roles usable even if an old hash drifted
          await conn.query(
            `UPDATE users SET
               name = ?, role = ?, password_hash = ?, status = 'active',
               email_verified = 1, admin_approved = 1, superadmin_approved = 1
             WHERE id = ?`,
            [s.name, s.role, hash, existing[0].id]
          );
          console.log(`👤 Repaired ${s.role}: ${s.email}`);
        }
      } catch (seedErr) {
        console.warn('Staff seed note:', seedErr.message);
      }
    }

    console.log('⚡ MySQL Database connected successfully with DobbyPay user tables.');
  } catch (err) {
    isMySQLAvailable = false;
    console.log('📱 No MySQL server needed. Running in 100% On-Device / Phone Storage Mode.');
  } finally {
    if (conn) conn.release();
  }
}

function memoryUsersQuery(sql, params = []) {
  const sqlUpper = String(sql).toUpperCase();
  const p = Array.isArray(params) ? params : [];

  if (sqlUpper.includes('SELECT') && sqlUpper.includes('FROM USERS')) {
    let rows = [...inMemoryUsers];
    // WHERE LOWER(email) = ? OR LOWER(name) = ?
    if (sqlUpper.includes('LOWER(EMAIL)') && p.length >= 1) {
      const a = String(p[0] || '').toLowerCase();
      const b = String(p[1] || p[0] || '').toLowerCase();
      rows = rows.filter(
        (u) => String(u.email).toLowerCase() === a || String(u.name).toLowerCase() === b
      );
    } else if (sqlUpper.includes('WHERE ID =') && p.length >= 1) {
      rows = rows.filter((u) => Number(u.id) === Number(p[0]));
    } else if (sqlUpper.includes("ROLE IN") || sqlUpper.includes('ORDER BY ID DESC')) {
      // admin users list — return all memory staff
      rows = [...inMemoryUsers];
    }
    if (sqlUpper.includes('LIMIT 1')) rows = rows.slice(0, 1);
    return [rows];
  }

  if (sqlUpper.includes('UPDATE USERS')) {
    return [{ affectedRows: 1 }];
  }

  if (sqlUpper.includes('INSERT INTO USERS')) {
    return [{ affectedRows: 1, insertId: inMemoryUsers.length + 1 }];
  }

  return null;
}

// Fallback proxy that safely handles queries when MySQL is absent
const safePool = {
  async query(sql, params = []) {
    if (isMySQLAvailable && pool) {
      try {
        return await pool.query(sql, params);
      } catch (err) {
        console.warn('MySQL query error, using local fallback:', err.message);
      }
    }
    // Safe in-memory responses when MySQL is not running
    const usersResult = memoryUsersQuery(sql, params);
    if (usersResult) return usersResult;

    const sqlUpper = String(sql).toUpperCase();
    if (sqlUpper.includes('COUNT(*)')) {
      return [[{ total: inMemorySongs.length, songCount: inMemorySongs.length, dirCount: inMemoryDirectors.length }]];
    }
    if (sqlUpper.includes('SELECT') && sqlUpper.includes('DIRECTORS')) {
      return [inMemoryDirectors];
    }
    if (sqlUpper.includes('INSERT INTO SONGS')) {
      if (params && params[0]) {
        inMemorySongs.push({ id: params[0], title: params[1], artist: params[2], audio_url: params[7] });
      }
      return [{ affectedRows: 1 }];
    }
    if (sqlUpper.includes('SELECT') && sqlUpper.includes('FROM SONGS')) {
      return [inMemorySongs];
    }
    return [[]];
  },
  async getConnection() {
    if (isMySQLAvailable && pool) {
      return await pool.getConnection();
    }
    return {
      query: (...args) => safePool.query(...args),
      release: () => {}
    };
  }
};

/** Retry Clever Cloud / primary MySQL every 60s while offline (office VPN often blocks :22207). */
export function startDbReconnectLoop() {
  if (!mysqlModule) return;
  setInterval(async () => {
    if (isMySQLAvailable) return;
    try {
      const nextPool = await createPoolWithConfig({});
      const conn = await nextPool.getConnection();
      conn.release();
      pool = nextPool;
      isMySQLAvailable = true;
      await initDatabase();
      console.log('⚡ MySQL reconnected successfully.');
    } catch (err) {
      console.warn('MySQL reconnect still failing:', err.message);
    }
  }, 60000);
}

export default safePool;

