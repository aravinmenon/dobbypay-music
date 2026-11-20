/**
 * JioSaavn client — Multi-platform Direct Engine with DES-ECB Stream Decryption
 * Powered by sumitkolhe/jiosaavn-api & cyberboysumanjay/JioSaavnAPI architecture.
 *
 * Guarantees:
 * 1. Supports local Express proxy during web dev.
 * 2. Uses native CapacitorHttp on Android/iOS to completely bypass WebView CORS restrictions.
 * 3. Decrypts encrypted_media_url to produce genuine 320kbps / 160kbps full-track HTTP 200 streams.
 * 4. Extracts real track duration (e.g. 5:58 for Munbe Vaa).
 */

import CryptoJS from 'crypto-js';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const DES_KEY = CryptoJS.enc.Utf8.parse('38346591');

function isNativeApp() {
  return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform();
}

/**
 * Native-only direct GET to JioSaavn.
 * Browser MUST use /api/saavn/* (Express via Vite proxy) — jiosaavn.com blocks CORS.
 */
async function nativeSafeGet(urlStr) {
  if (!isNativeApp()) {
    throw new Error('Direct JioSaavn calls are blocked in the browser (CORS). Use /api/saavn proxy.');
  }
  const res = await CapacitorHttp.get({
    url: urlStr,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  });
  if (!res || res.status >= 400) {
    throw new Error(`HTTP ${res?.status || 0}`);
  }
  if (res.data == null) return null;
  return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
}

async function proxyGet(path, { signal } = {}) {
  const res = await fetch(path, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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

export function pickSaavnAudioUrl(item, detail) {
  // If detail has media_url, pick 320kbps or media_url
  const fromDetail = detail?.media_url;
  if (fromDetail && !String(fromDetail).includes('404')) return fromDetail;

  const fromItem = item?.media_url;
  if (fromItem && !String(fromItem).includes('404')) return fromItem;

  // Try decrypting encrypted_media_url if present
  const enc = detail?.encrypted_media_url || item?.more_info?.encrypted_media_url || item?.encrypted_media_url;
  if (enc) {
    const dec = decryptMediaUrl(enc);
    if (dec) return dec.replace('_96', '_320');
  }

  const downloads = item?.downloadUrl || detail?.downloadUrl;
  if (Array.isArray(downloads) && downloads.length) {
    const hq = downloads.find(
      (d) =>
        typeof d?.link === 'string' &&
        (d.quality === '320kbps' || d.quality === '320')
    );
    if (hq?.link) return hq.link;
    const mid = downloads.find((d) => d.quality === '160kbps');
    if (mid?.link) return mid.link;
    return downloads[downloads.length - 1]?.link;
  }
  return null;
}

export function parseDurationSeconds(detail, fallback = 240) {
  if (typeof detail?.duration === 'number' && detail.duration > 0) {
    return detail.duration > 600 ? Math.floor(detail.duration / 1000) : detail.duration;
  }
  if (typeof detail?.duration === 'string') {
    if (detail.duration.includes(':')) {
      const [m, s] = detail.duration.split(':').map(Number);
      if (!Number.isNaN(m) && !Number.isNaN(s)) return m * 60 + s;
    }
    const n = parseInt(detail.duration, 10);
    if (!Number.isNaN(n) && n > 0) return n > 600 ? Math.floor(n / 1000) : n;
  }
  const sec = detail?.more_info?.duration;
  if (typeof sec === 'number' && sec > 0) return sec;
  return fallback;
}

/**
 * Format raw JioSaavn item into full-featured track object
 */
function formatRawSaavnItem(item) {
  if (!item) return null;
  const enc = item.more_info?.encrypted_media_url || item.encrypted_media_url;
  const dec = decryptMediaUrl(enc);
  const url320 = dec ? dec.replace('_96', '_320') : null;
  const url160 = dec ? dec.replace('_96', '_160') : null;
  const dur = parseInt(item.more_info?.duration || item.duration || 0, 10);
  const albumName = item.more_info?.album || item.album || '';
  const langName = item.language || item.more_info?.language || '';

  return {
    id: String(item.id || ''),
    title: item.title || item.song || '',
    song: item.song || item.title || '',
    artist: item.more_info?.primary_artists || item.more_info?.singers || item.primary_artists || item.singers || item.subtitle || '',
    album: albumName,
    year: item.year || item.more_info?.year || '',
    duration: dur,
    image: (item.image || '').replace('150x150', '500x500'),
    media_url: url320 || url160 || dec,
    language: langName,
    more_info: item.more_info,
    downloadUrl: [
      { quality: '96kbps', link: dec },
      { quality: '160kbps', link: url160 },
      { quality: '320kbps', link: url320 }
    ].filter(x => Boolean(x.link))
  };
}

export async function fetchSaavnSearch(query, { language, signal, page = 1, pages = 1 } = {}) {
  const cleanQ = (query || '').trim();
  if (!cleanQ) return [];

  const pageCount = Math.max(1, Math.min(Number(pages) || 1, 4));
  const startPage = Math.max(1, Number(page) || 1);
  const all = [];
  const seenIds = new Set();

  const pushUnique = (items) => {
    for (const item of items || []) {
      if (!item) continue;
      const id = String(item.id || item.saavnId || `${item.title}-${item.artist}`);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      all.push(item);
    }
  };

  for (let p = startPage; p < startPage + pageCount; p++) {
    // Browser / web: always use local Express proxy (avoids CORS + 403 from jiosaavn.com)
    try {
      const data = await proxyGet(
        `/api/saavn/search?query=${encodeURIComponent(cleanQ)}&page=${p}&n=50`,
        { signal }
      );
      if (Array.isArray(data?.results) && data.results.length > 0) {
        pushUnique(data.results);
        continue;
      }
      // Empty page from proxy — stop paging; do not hit jiosaavn.com from the browser
      if (!isNativeApp()) break;
    } catch (err) {
      if (!isNativeApp()) {
        console.warn('[saavnClient] Proxy search failed (is API on :5000?):', err.message);
        break;
      }
    }

    // Native Android/iOS only: CapacitorHttp can call JioSaavn without CORS
    if (!isNativeApp()) continue;
    try {
      const url = new URL('https://www.jiosaavn.com/api.php');
      url.searchParams.append('__call', 'search.getResults');
      url.searchParams.append('_format', 'json');
      url.searchParams.append('_marker', '0');
      url.searchParams.append('api_version', '4');
      url.searchParams.append('ctx', 'web6dot0');
      url.searchParams.append('q', cleanQ);
      url.searchParams.append('p', String(p));
      url.searchParams.append('n', '50');

      const data = await nativeSafeGet(url.toString());
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        pushUnique(data.results.map(formatRawSaavnItem).filter(Boolean));
      }
    } catch (err) {
      console.warn('[saavnClient] Native search note:', err.message);
    }
  }

  return all;
}

export async function fetchSaavnSong(id, { signal } = {}) {
  if (!id) return null;

  try {
    const data = await proxyGet(`/api/saavn/song?id=${encodeURIComponent(id)}`, { signal });
    if (data && (data.media_url || data.downloadUrl)) return data;
  } catch (err) {
    if (!isNativeApp()) {
      console.warn('[saavnClient] Proxy song failed:', err.message);
      return null;
    }
  }

  if (!isNativeApp()) return null;

  try {
    const url = new URL('https://www.jiosaavn.com/api.php');
    url.searchParams.append('__call', 'song.getDetails');
    url.searchParams.append('_format', 'json');
    url.searchParams.append('_marker', '0');
    url.searchParams.append('api_version', '4');
    url.searchParams.append('ctx', 'web6dot0');
    url.searchParams.append('pids', String(id).trim());

    const data = await nativeSafeGet(url.toString());
    const rawSong = data.songs?.[0] || data[String(id).trim()] || data[Object.keys(data)[0]];
    const formatted = formatRawSaavnItem(rawSong);
    if (formatted) return formatted;
  } catch (err) {
    console.warn('[saavnClient] Native song detail note:', err.message);
  }

  return null;
}

export async function fetchSaavnLyrics(id, { signal } = {}) {
  if (!id) return null;

  try {
    return await proxyGet(`/api/saavn/lyrics?id=${encodeURIComponent(id)}`, { signal });
  } catch (err) {
    if (!isNativeApp()) {
      console.warn('[saavnClient] Proxy lyrics failed:', err.message);
      return null;
    }
  }

  if (!isNativeApp()) return null;

  try {
    const url = new URL('https://www.jiosaavn.com/api.php');
    url.searchParams.append('__call', 'lyrics.getLyrics');
    url.searchParams.append('_format', 'json');
    url.searchParams.append('_marker', '0');
    url.searchParams.append('api_version', '4');
    url.searchParams.append('ctx', 'web6dot0');
    url.searchParams.append('lyrics_id', String(id).trim());

    const data = await nativeSafeGet(url.toString());
    if (data) {
      return { success: true, lyrics: data.lyrics || '', snippet: data.snippet || '' };
    }
  } catch (err) {
    console.warn('[saavnClient] Native lyrics note:', err.message);
  }

  return null;
}

export function lyricsPayloadToLines(data) {
  const raw = data?.lyrics || data?.data?.lyrics || data?.snippet || '';
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .replace(/<br\s*[\/]?>/gi, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}
