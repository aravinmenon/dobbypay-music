import dotenv from 'dotenv';
dotenv.config();
import pool, { initDatabase } from '../server/db.js';

await initDatabase();
const email = process.argv[2] || 'abc@gmail.com';
const [result] = await pool.query(
  `UPDATE users
   SET admin_approved = 0, superadmin_approved = 0, status = 'pending'
   WHERE LOWER(email) = ? AND role = 'client'`,
  [email.toLowerCase()]
);
console.log('Set pending rows:', result.affectedRows);
const [rows] = await pool.query(
  'SELECT id, name, email, role, status, admin_approved, superadmin_approved FROM users ORDER BY id'
);
console.log(rows);
process.exit(0);
