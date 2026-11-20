/**
 * JioSaavn Direct Engine & Reverse Proxy with DES-ECB Stream Decryption
 * Based on sumitkolhe/jiosaavn-api and cyberboysumanjay/JioSaavnAPI architecture.
 * Decrypts encrypted_media_url to produce true 320kbps full-length HTTP 200 streams.
 */

import CryptoJS from 'crypto-js';

const DES_KEY = CryptoJS.enc.Utf8.parse('38346591');
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function decryptMediaUrl(encrypted) {
  if (!encrypted) return null;
  try {
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encrypted) },
      DES_KEY,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const link = decrypted.toString(CryptoJS.enc.Utf8);
    return (link && link.startsWith('http')) ? link : null;
  } catch {
    return null;
  }
}

function formatSongItem(item) {
  if (!item) return null;
  const enc = item.more_info?.encrypted_media_url || item.encrypted_media_url;
  const dec = decryptMediaUrl(enc);
  const url320 = dec ? dec.replace('_96', '_320') : null;
  const url160 = dec ? dec.replace('_96', '_160') : null;
  const dur = parseInt(item.more_info?.duration || item.duration || 0, 10);

  return {
    id: item.id,
    title: item.title || item.song || '',
    song: item.song || item.title || '',
    artist: item.more_info?.primary_artists || item.more_info?.singers || item.primary_artists || item.singers || item.subtitle || '',
    album: item.more_info?.album || item.album || '',
    year: item.year || item.more_info?.year || '',
    duration: dur,
    image: (item.image || '').replace('150x150', '500x500').replace('http://', 'https://'),
    media_url: url320 || url160 || dec,
    language: item.language || item.more_info?.language || '',
    more_info: item.more_info,
    downloadUrl: [
      { quality: '96kbps', link: dec },
      { quality: '160kbps', link: url160 },
      { quality: '320kbps', link: url320 }
    ].filter(x => !!x.link),
    has_lyrics: item.more_info?.has_lyrics === 'true' || item.has_lyrics === 'true',
    lyrics_id: item.more_info?.lyrics_id || item.id
  };
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;
const hits = new Map();

function rateLimitOk(ip) {
  const key = ip || 'unknown';
  const now = Date.now();
  let bucket = hits.get(key);
  if (!bucket || now - bucket.start > RATE_LIMIT_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    hits.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT_MAX;
}

export function registerSaavnRoutes(app) {
  app.get('/api/saavn/search', async (req, res) => {
    const ip = req.ip || req.socket?.remoteAddress;
    if (!rateLimitOk(ip)) {
      return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
    }

    const query = req.query.query || req.query.q;
    if (!query || !String(query).trim()) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }

    try {
      const page = Math.max(1, Math.min(parseInt(String(req.query.page || req.query.p || '1'), 10) || 1, 20));
      const n = Math.max(10, Math.min(parseInt(String(req.query.n || req.query.limit || '50'), 10) || 50, 50));

      const url = new URL('https://www.jiosaavn.com/api.php');
      url.searchParams.append('__call', 'search.getResults');
      url.searchParams.append('_format', 'json');
      url.searchParams.append('_marker', '0');
      url.searchParams.append('api_version', '4');
      url.searchParams.append('ctx', 'web6dot0');
      url.searchParams.append('q', String(query).trim());
      url.searchParams.append('p', String(page));
      url.searchParams.append('n', String(n));

      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': getRandomUserAgent() }
      });
      const data = await response.json();
      const rawResults = data.results || [];
      const formatted = rawResults.map(formatSongItem).filter(Boolean);

      res.json({
        success: true,
        results: formatted,
        total: formatted.length,
        page,
        n
      });
    } catch (err) {
      console.error('[saavn/search error]', err.message);
      res.status(502).json({ success: false, error: err.message });
    }
  });

  app.get('/api/saavn/song', async (req, res) => {
    const ip = req.ip || req.socket?.remoteAddress;
    if (!rateLimitOk(ip)) {
      return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
    }

    const id = req.query.id;
    if (!id) {
      return res.status(400).json({ success: false, error: 'id is required' });
    }

    try {
      const url = new URL('https://www.jiosaavn.com/api.php');
      url.searchParams.append('__call', 'song.getDetails');
      url.searchParams.append('_format', 'json');
      url.searchParams.append('_marker', '0');
      url.searchParams.append('api_version', '4');
      url.searchParams.append('ctx', 'web6dot0');
      url.searchParams.append('pids', String(id).trim());

      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': getRandomUserAgent() }
      });
      const data = await response.json();
      const rawSong = data.songs?.[0] || data[String(id).trim()] || data[Object.keys(data)[0]];
      const formatted = formatSongItem(rawSong);

      if (!formatted) {
        return res.status(404).json({ success: false, error: 'Song not found' });
      }

      res.json({ success: true, ...formatted, data: formatted });
    } catch (err) {
      console.error('[saavn/song error]', err.message);
      res.status(502).json({ success: false, error: err.message });
    }
  });

  app.get('/api/saavn/lyrics', async (req, res) => {
    const ip = req.ip || req.socket?.remoteAddress;
    if (!rateLimitOk(ip)) {
      return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
    }

    const id = req.query.id;
    if (!id) {
      return res.status(400).json({ success: false, error: 'id is required' });
    }

    try {
      const url = new URL('https://www.jiosaavn.com/api.php');
      url.searchParams.append('__call', 'lyrics.getLyrics');
      url.searchParams.append('_format', 'json');
      url.searchParams.append('_marker', '0');
      url.searchParams.append('api_version', '4');
      url.searchParams.append('ctx', 'web6dot0');
      url.searchParams.append('lyrics_id', String(id).trim());

      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': getRandomUserAgent() }
      });
      const data = await response.json();
      res.json({ success: true, lyrics: data.lyrics || '', snippet: data.snippet || '' });
    } catch (err) {
      console.error('[saavn/lyrics error]', err.message);
      res.status(502).json({ success: false, error: err.message });
    }
  });

  app.get('/api/saavn/health', (_req, res) => {
    res.json({ success: true, engine: 'direct-jiosaavn-des-ecb' });
  });
}
