import dotenv from 'dotenv';
dotenv.config();
import pool, { initDatabase } from '../server/db.js';

await initDatabase();
const [tables] = await pool.query('SHOW TABLES');
console.log('TABLES:', tables);

for (const name of ['users', 'user_libraries', 'dobbypay_users']) {
  try {
    const [cols] = await pool.query(`SHOW COLUMNS FROM ${name}`);
    console.log(`\n${name}:`, cols.map((c) => c.Field).join(', '));
  } catch (e) {
    console.log(`\n${name}: MISSING (${e.message})`);
  }
}
process.exit(0);
