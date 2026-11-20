import dotenv from 'dotenv';
dotenv.config();
import pool, { initDatabase } from '../server/db.js';

await initDatabase();
const email = process.argv[2] || 'abc@gmail.com';
const [result] = await pool.query(
  `UPDATE users
   SET admin_approved = 1, superadmin_approved = 1, status = 'active'
   WHERE LOWER(email) = ? OR LOWER(name) = ?`,
  [email.toLowerCase(), email.toLowerCase()]
);
console.log('Updated rows:', result.affectedRows);
const [rows] = await pool.query(
  'SELECT id, name, email, status, admin_approved, superadmin_approved FROM users WHERE LOWER(email) = ?',
  [email.toLowerCase()]
);
console.log(rows);
process.exit(0);
