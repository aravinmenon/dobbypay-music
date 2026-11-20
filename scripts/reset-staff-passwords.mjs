import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

dotenv.config();

const sha256 = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

const staff = [
  { name: 'Admin', email: 'admin@dobbypay.com', role: 'admin', password: 'Admin@123' },
  { name: 'Super Admin', email: 'superadmin@dobbypay.com', role: 'super_admin', password: 'Super@123' },
];

const pool = await mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQL_ADDON_HOST,
  port: Number(process.env.DB_PORT || process.env.MYSQL_ADDON_PORT || 3306),
  user: process.env.DB_USER || process.env.MYSQL_ADDON_USER,
  password: process.env.DB_PASS || process.env.MYSQL_ADDON_PASSWORD,
  database: process.env.DB_NAME || process.env.MYSQL_ADDON_DB,
  ssl: String(process.env.DB_SSL || '').toLowerCase() === 'true' ? { rejectUnauthorized: false } : undefined,
});

const [before] = await pool.query(
  `SELECT id, name, email, role, status, admin_approved, superadmin_approved,
          LEFT(password_hash, 12) AS hash_prefix, CHAR_LENGTH(password_hash) AS hash_len
   FROM users
   WHERE LOWER(email) IN (?, ?) OR role IN ('admin', 'super_admin')`,
  ['admin@dobbypay.com', 'superadmin@dobbypay.com']
);
console.log('Before:', JSON.stringify(before, null, 2));

for (const s of staff) {
  const hash = sha256(s.password);
  const [existing] = await pool.query('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [s.email]);
  if (existing.length) {
    await pool.query(
      `UPDATE users SET
         name = ?, role = ?, password_hash = ?, status = 'active',
         email_verified = 1, admin_approved = 1, superadmin_approved = 1
       WHERE id = ?`,
      [s.name, s.role, hash, existing[0].id]
    );
    console.log(`Updated ${s.email} → password ${s.password}`);
  } else {
    await pool.query(
      `INSERT INTO users (
         name, email, password_hash, role, phone, status,
         email_verified, admin_approved, superadmin_approved
       ) VALUES (?, ?, ?, ?, NULL, 'active', 1, 1, 1)`,
      [s.name, s.email, hash, s.role]
    );
    console.log(`Inserted ${s.email} → password ${s.password}`);
  }
}

// Verify with same logic as server
function verifyPassword(password, hash) {
  const strPwd = String(password || '');
  const strHash = String(hash || '');
  if (!strPwd || !strHash) return false;
  if (strHash.startsWith('$2')) {
    try {
      if (bcrypt.compareSync(strPwd, strHash)) return true;
      const hash2a = strHash.replace(/^\$2y\$/, '$2a$');
      if (bcrypt.compareSync(strPwd, hash2a)) return true;
    } catch (_) {}
  }
  return sha256(strPwd) === strHash;
}

for (const s of staff) {
  const [rows] = await pool.query('SELECT password_hash FROM users WHERE LOWER(email)=? LIMIT 1', [s.email]);
  const ok = rows[0] && verifyPassword(s.password, rows[0].password_hash);
  console.log(`Verify ${s.email}: ${ok ? 'OK' : 'FAIL'}`);
}

await pool.end();
console.log('Done.');
