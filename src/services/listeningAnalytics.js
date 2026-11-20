import { getApiBase } from './authService';

const isLocalBrowser =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

/**
 * Record listen time / play count for a logged-in customer (MySQL song_plays).
 */
export async function recordSongPlay({
  userId,
  songId,
  title,
  artist,
  coverUrl,
  listenSeconds = 0,
  playCount = 1
}) {
  if (!userId || !songId) return { success: false };
  const body = {
    userId,
    songId: String(songId),
    songTitle: title || 'Unknown',
    songArtist: artist || '',
    coverUrl: coverUrl || null,
    listenSeconds: Math.max(0, Math.round(Number(listenSeconds) || 0)),
    playCount: Math.max(0, Math.round(Number(playCount) || 0))
  };
  if (body.listenSeconds < 1 && body.playCount < 1) return { success: true, skipped: true };

  const urls = [];
  const base = getApiBase();
  if (base) {
    urls.push(`${base.replace(/\/+$/, '')}/plays/record`);
  }
  if (isLocalBrowser) {
    urls.push('/api/plays/record', '/api/play/record');
  }

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: true, ...data };
      }
    } catch (_) {}
  }
  return { success: false };
}

/**
 * Admin / Super Admin listening analytics dashboard payload.
 */
export async function fetchListeningDashboard() {
  const urls = [];
  const base = getApiBase();
  if (base) {
    urls.push(`${base.replace(/\/+$/, '')}/admin/listening-dashboard`);
  }
  if (isLocalBrowser) {
    urls.push('/api/admin/listening-dashboard', '/api/admin/play-dashboard');
  }

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success !== false) {
          return {
            summary: data.summary || {
              totalPlays: 0,
              totalListenSeconds: 0,
              uniqueListeners: 0,
              uniqueSongs: 0
            },
            topSongs: Array.isArray(data.topSongs) ? data.topSongs : [],
            topListeners: Array.isArray(data.topListeners) ? data.topListeners : []
          };
        }
      }
    } catch (_) {}
  }

  return {
    summary: { totalPlays: 0, totalListenSeconds: 0, uniqueListeners: 0, uniqueSongs: 0 },
    topSongs: [],
    topListeners: []
  };
}

export function formatListenDuration(totalSeconds) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
