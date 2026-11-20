import { Capacitor } from '@capacitor/core';
import { getApiBase, resolveApiUrl } from './authService.js';

const isNativeApp = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform();
const isLocalBrowser = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  !isNativeApp;

function libraryRequestUrl(userId, method) {
  if (isLocalBrowser) {
    const q = method === 'GET' && userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return `/api/library${q}`;
  }
  const base = getApiBase();
  const resolved = resolveApiUrl(base, 'library');
  if (method === 'GET' && userId) {
    const join = resolved.includes('?') ? '&' : '?';
    return `${resolved}${join}userId=${encodeURIComponent(userId)}`;
  }
  return resolved;
}

export function slimTrackForAccount(track) {
  if (!track || !track.id) return null;
  return {
    id: track.id,
    title: track.title || '',
    artist: track.artist || '',
    album: track.album || '',
    director: track.director || '',
    audioUrl: track.audioUrl || '',
    coverUrl: track.coverUrl || '',
    duration: track.duration || '',
    durationSec: track.durationSec || 0,
    genre: track.genre || '',
    language: track.language || '',
    category: track.category || '',
    color: track.color || '',
  };
}

export function slimPlaylistForAccount(playlist) {
  if (!playlist) return null;
  const customTracks = Array.isArray(playlist.customTracks)
    ? playlist.customTracks.map(slimTrackForAccount).filter(Boolean)
    : [];
  return {
    id: playlist.id,
    title: playlist.title || 'Playlist',
    description: playlist.description || '',
    coverUrl: playlist.coverUrl || '',
    color: playlist.color || '#FF6B00',
    owner: playlist.owner || '',
    trackIds: Array.isArray(playlist.trackIds) ? playlist.trackIds : customTracks.map((t) => t.id),
    tracksCount: playlist.tracksCount || (playlist.trackIds || []).length || customTracks.length,
    customTracks,
  };
}

const emptyLibrary = () => ({
  likedTrackIds: [],
  likedTracks: [],
  playlists: [],
});

/**
 * Load this user's library payload from MySQL (user_libraries.payload).
 * Returns empty arrays when the user has no row yet — never mixes other users.
 */
export async function fetchAccountLibrary(userId) {
  if (!userId) return emptyLibrary();
  const url = libraryRequestUrl(userId, 'GET');
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Library fetch failed (${res.status})`);
  }
  const data = await res.json();
  const lib = data?.library;
  if (!lib || typeof lib !== 'object') return emptyLibrary();
  return {
    likedTrackIds: Array.isArray(lib.likedTrackIds) ? lib.likedTrackIds : [],
    likedTracks: Array.isArray(lib.likedTracks) ? lib.likedTracks : [],
    playlists: Array.isArray(lib.playlists) ? lib.playlists : [],
    updatedAt: lib.updatedAt || null,
  };
}

/**
 * Upsert liked songs / playlists for one user only (INSERT … ON DUPLICATE KEY UPDATE).
 */
export async function saveAccountLibrary(userId, payload) {
  if (!userId) return { ok: false };
  const body = {
    userId,
    likedTrackIds: payload.likedTrackIds || [],
    likedTracks: (payload.likedTracks || []).map(slimTrackForAccount).filter(Boolean),
    playlists: (payload.playlists || []).map(slimPlaylistForAccount).filter(Boolean),
  };

  const trySave = async (method) => {
    const url = libraryRequestUrl(userId, method === 'GET' ? 'GET' : 'PUT');
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    return res;
  };

  let res = await trySave('PUT');
  if (!res.ok && (res.status === 404 || res.status === 405)) {
    res = await trySave('POST');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error || `HTTP ${res.status}`, suspended: !!data.suspended };
  }
  return { ok: true };
}
