import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function buildFullMp3Database() {
  console.log('🚀 Extracting 600+ Full Length MP3s from Internet Archive...');

  // Fetch full file list from Anirudh & Tamil 128k Archive collection
  const r = await fetch('https://archive.org/metadata/anirudh-hit-songs-tamil-128k/files');
  const d = await r.json();
  const tamilMp3s = (d.result || []).filter(f => f.name && f.name.endsWith('.mp3') && parseInt(f.size || 0) > 2000000);

  console.log(`Found ${tamilMp3s.length} FULL-LENGTH Tamil MP3s (>2MB)!`);

  // Map to archive download URLs
  const fullTamilUrls = tamilMp3s.map(f => `https://archive.org/download/anirudh-hit-songs-tamil-128k/${encodeURIComponent(f.name)}`);

  // Fetch Bollywood full MP3 collection
  const bR = await fetch('https://archive.org/metadata/best-of-pop-songs-bollywood/files');
  const bD = await bR.json();
  const hindiMp3s = (bD.result || []).filter(f => f.name && f.name.endsWith('.mp3') && parseInt(f.size || 0) > 2000000);
  console.log(`Found ${hindiMp3s.length} FULL-LENGTH Hindi MP3s (>2MB)!`);

  const fullHindiUrls = hindiMp3s.map(f => `https://archive.org/download/best-of-pop-songs-bollywood/${encodeURIComponent(f.name)}`);

  const masterPool = [...fullTamilUrls, ...fullHindiUrls];
  console.log(`MASTER FULL MP3 POOL SIZE: ${masterPool.length} FULL LENGTH SONGS!`);

  // 1. Update indianMusicData.js
  let indianData = fs.readFileSync('src/data/indianMusicData.js', 'utf8');
  let idx = 0;
  indianData = indianData.replace(/audioUrl:\s*"[^"]+"/g, () => {
    const fullUrl = masterPool[idx % masterPool.length];
    idx++;
    return `audioUrl: "${fullUrl}"`;
  });
  fs.writeFileSync('src/data/indianMusicData.js', indianData);
  console.log(`✓ Updated indianMusicData.js with ${idx} FULL-LENGTH MP3s!`);

  // 2. Update tamilTracks.js
  let tamilData = fs.readFileSync('src/data/tamilTracks.js', 'utf8');
  let tamIdx = 0;
  tamilData = tamilData.replace(/audioUrl:\s*"[^"]+"/g, () => {
    const fullUrl = fullTamilUrls[tamIdx % fullTamilUrls.length];
    tamIdx++;
    return `audioUrl: "${fullUrl}"`;
  });
  fs.writeFileSync('src/data/tamilTracks.js', tamilData);
  console.log(`✓ Updated tamilTracks.js with ${tamIdx} FULL-LENGTH MP3s!`);

  // 3. Update mockTracks.js
  let mockData = fs.readFileSync('src/data/mockTracks.js', 'utf8');
  let mockIdx = 0;
  mockData = mockData.replace(/audioUrl:\s*"[^"]+"/g, () => {
    const fullUrl = masterPool[mockIdx % masterPool.length];
    mockIdx++;
    return `audioUrl: "${fullUrl}"`;
  });
  fs.writeFileSync('src/data/mockTracks.js', mockData);
  console.log(`✓ Updated mockTracks.js with ${mockIdx} FULL-LENGTH MP3s!`);

  // 4. Update MySQL Database 'songs' Table
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3310'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'dobbyppay'
    });

    const [rows] = await conn.query('SELECT id FROM songs');
    console.log(`Updating ${rows.length} songs in MySQL database...`);

    let dbIdx = 0;
    for (const row of rows) {
      const fullUrl = masterPool[dbIdx % masterPool.length];
      await conn.query('UPDATE songs SET audio_url = ? WHERE id = ?', [fullUrl, row.id]);
      dbIdx++;
    }

    console.log(`✓ Successfully updated ${dbIdx} songs in MySQL Database with FULL-LENGTH MP3 URLs!`);
    await conn.end();
  } catch (err) {
    console.error('MySQL update error:', err.message);
  }
}

buildFullMp3Database();
