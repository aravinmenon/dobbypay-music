import pool from './db.js';

const memory = new Map();
let tableReady = false;

export async function ensureLibraryTable() {
  if (tableReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_libraries (
        user_id VARCHAR(64) PRIMARY KEY,
        payload LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    tableReady = true;
  } catch (err) {
    console.warn('user_libraries table:', err.message);
  }
}

function parsePayload(raw) {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

export async function readLibrary(userId) {
  const key = String(userId || '').trim();
  if (!key) return null;
  try {
    await ensureLibraryTable();
    const [rows] = await pool.query(
      'SELECT payload FROM user_libraries WHERE user_id = ? LIMIT 1',
      [key]
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    if (row && row.payload) {
      const parsed = parsePayload(row.payload);
      if (parsed) {
        memory.set(key, parsed);
        return parsed;
      }
    }
  } catch (err) {
    console.warn('readLibrary:', err.message);
  }
  return memory.get(key) || null;
}

export async function writeLibrary(userId, payload) {
  const key = String(userId || '').trim();
  if (!key) throw new Error('userId is required');
  const stored = {
    likedTrackIds: Array.isArray(payload?.likedTrackIds) ? payload.likedTrackIds : [],
    likedTracks: Array.isArray(payload?.likedTracks) ? payload.likedTracks : [],
    playlists: Array.isArray(payload?.playlists) ? payload.playlists : [],
    updatedAt: new Date().toISOString(),
  };
  memory.set(key, stored);
  try {
    await ensureLibraryTable();
    const json = JSON.stringify(stored);
    await pool.query(
      `INSERT INTO user_libraries (user_id, payload) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload)`,
      [key, json]
    );
  } catch (err) {
    console.warn('writeLibrary kept in memory:', err.message);
  }
  return stored;
}
