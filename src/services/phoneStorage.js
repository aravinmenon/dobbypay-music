/**
 * phoneStorage.js — 100% Client-Side Phone & Local Storage Engine
 * 
 * Replaces MySQL database entirely with persistent on-device storage.
 * Works seamlessly on Android APK, iOS, and Web browsers.
 * 
 * Features:
 * - Saved/Offline songs repository
 * - User custom playlists
 * - Liked songs (Favorites)
 * - Recently played history
 * - DobbyPay micropayment wallet state
 */

const STORAGE_KEYS = {
  TRACKS: 'phone_stored_tracks',
  PLAYLISTS: 'phone_user_playlists',
  LIKED: 'phone_liked_track_ids',
  RECENT: 'phone_recently_played_tracks',
  SONG_COVERS: 'phone_song_cover_overrides',
  WALLET: 'dobby_wallet',
  TRANSACTIONS: 'dobby_transactions'
};

/**
 * Safely parse JSON from localStorage
 */
function readStorage(key, fallback = []) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn(`[phoneStorage] Failed to read ${key}:`, err);
    return fallback;
  }
}

/**
 * Safely write JSON to localStorage
 */
function writeStorage(key, data) {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn(`[phoneStorage] Failed to write ${key}:`, err);
    return false;
  }
}

// ─── 1. Phone Stored Tracks (Offline & Cached Songs) ───────────────

/**
 * Get all songs saved in phone storage
 * @returns {Array} List of tracks
 */
export function getPhoneStoredTracks() {
  return readStorage(STORAGE_KEYS.TRACKS, []);
}

/**
 * Save a track to phone storage
 * @param {Object} track
 * @returns {boolean} Success status
 */
export function saveTrackToPhone(track) {
  if (!track || !track.id) return false;
  const tracks = getPhoneStoredTracks();
  const exists = tracks.some(t => t.id === track.id || (t.title === track.title && t.artist === track.artist));
  
  if (!exists) {
    const enrichedTrack = {
      ...track,
      savedAt: Date.now(),
      savedDateFormatted: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    };
    const updated = [enrichedTrack, ...tracks];
    return writeStorage(STORAGE_KEYS.TRACKS, updated);
  }
  return true;
}

/**
 * Super Admin: Batch save all songs to local storage
 * @param {Array} newTracks List of song objects
 * @returns {{ total: number, added: number }}
 */
export function saveAllTracksToPhone(newTracks = []) {
  if (!Array.isArray(newTracks) || newTracks.length === 0) {
    return { total: getPhoneStoredTracks().length, added: 0 };
  }
  const existing = getPhoneStoredTracks();
  const existingMap = new Map();
  
  existing.forEach(t => {
    if (t && t.id) existingMap.set(String(t.id), t);
  });

  let addedCount = 0;
  const now = Date.now();
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  newTracks.forEach(track => {
    if (track && (track.id || track.title)) {
      const trackId = String(track.id || `track-${Math.random()}`);
      if (!existingMap.has(trackId)) {
        existingMap.set(trackId, {
          ...track,
          id: trackId,
          savedAt: now,
          savedDateFormatted: formattedDate,
          isOfflineAvailable: true
        });
        addedCount++;
      }
    }
  });

  const merged = Array.from(existingMap.values());
  writeStorage(STORAGE_KEYS.TRACKS, merged);
  return { total: merged.length, added: addedCount };
}

/**
 * Trigger a JSON file download in browser / WebView
 */
function downloadJsonFile(payload, filename) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Super Admin: Export all stored songs to a downloadable JSON file
 * @param {string} filename 
 */
export function exportTracksAsJson(filename = 'dobbypay_all_songs_backup.json') {
  const tracks = getPhoneStoredTracks();
  downloadJsonFile(tracks, filename);
  return tracks.length;
}

/**
 * Normalize a liked-song track for backup / restore
 */
function sanitizeLikedTrack(track) {
  if (!track || typeof track !== 'object') return null;
  const id = track.id || `liked-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const title = (track.title || track.name || '').trim();
  if (!title) return null;
  return {
    id,
    title,
    artist: track.artist || track.artists || 'Unknown Artist',
    album: track.album || track.film || '',
    coverUrl: track.coverUrl || track.image || track.artwork || '',
    audioUrl: track.audioUrl || track.url || track.previewUrl || '',
    durationSec: Number(track.durationSec || track.duration || 0) || 0,
    genre: track.genre || '',
    language: track.language || '',
    source: track.source || 'liked-backup',
  };
}

/**
 * Export liked songs (ids + full track objects) as a downloadable JSON backup.
 * Save this file before uninstall so likes can be restored later.
 */
export function exportLikedSongsAsJson(likedTrackIds = [], likedTracksData = [], filename = 'dobbypay_liked_songs.json') {
  const tracks = (likedTracksData || [])
    .map(sanitizeLikedTrack)
    .filter(Boolean);
  const ids = Array.isArray(likedTrackIds) && likedTrackIds.length
    ? [...new Set(likedTrackIds)]
    : tracks.map((t) => t.id);

  const payload = {
    version: 1,
    type: 'dobbypay_liked_songs',
    exportedAt: new Date().toISOString(),
    count: tracks.length,
    likedTrackIds: ids,
    likedTracks: tracks,
  };

  downloadJsonFile(payload, filename);
  return tracks.length;
}

/**
 * Parse an uploaded liked-songs JSON backup.
 * Accepts either the full backup object or a plain track array.
 * @returns {{ likedTrackIds: string[], likedTracks: object[] }}
 */
export function parseLikedSongsBackup(raw) {
  let data = raw;
  if (typeof raw === 'string') {
    data = JSON.parse(raw);
  }

  let tracks = [];
  let ids = [];

  if (Array.isArray(data)) {
    tracks = data;
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.likedTracks)) tracks = data.likedTracks;
    else if (Array.isArray(data.tracks)) tracks = data.tracks;
    else if (Array.isArray(data.songs)) tracks = data.songs;

    if (Array.isArray(data.likedTrackIds)) ids = data.likedTrackIds;
    else if (Array.isArray(data.ids)) ids = data.ids;
  } else {
    throw new Error('Invalid liked songs JSON');
  }

  const likedTracks = tracks.map(sanitizeLikedTrack).filter(Boolean);
  const likedTrackIds = ids.length
    ? [...new Set(ids.map(String))]
    : likedTracks.map((t) => t.id);

  if (likedTracks.length === 0 && likedTrackIds.length === 0) {
    throw new Error('No liked songs found in this file');
  }

  return { likedTrackIds, likedTracks };
}

/**
 * Cache single song audio into browser Cache API for complete offline playback
 * @param {Object} track 
 */
export async function cacheTrackAudioOffline(track) {
  if (!track || !track.audioUrl) return false;
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open('dobbypay-offline-songs-v1');
      const res = await fetch(track.audioUrl, { mode: 'cors' });
      if (res.ok) {
        await cache.put(track.audioUrl, res);
        return true;
      }
    } catch (e) {
      console.warn('Audio cache warning for', track.title, e.message);
    }
  }
  return false;
}

/**
 * Remove a track from phone storage
 * @param {string} trackId
 * @returns {boolean}
 */
export function removeTrackFromPhone(trackId) {
  if (!trackId) return false;
  const tracks = getPhoneStoredTracks();
  const filtered = tracks.filter(t => t.id !== trackId);
  return writeStorage(STORAGE_KEYS.TRACKS, filtered);
}

/**
 * Check if a track is stored on phone
 * @param {string} trackId
 * @returns {boolean}
 */
export function isSongSavedOnPhone(trackId) {
  if (!trackId) return false;
  const tracks = getPhoneStoredTracks();
  return tracks.some(t => t.id === trackId);
}

/**
 * Clear all songs from phone storage
 */
export function clearPhoneStorage() {
  return writeStorage(STORAGE_KEYS.TRACKS, []);
}

/**
 * Get phone storage summary stats
 */
export function getPhoneStorageStats() {
  const tracks = getPhoneStoredTracks();
  const liked = getPhoneLikedSongs();
  const playlists = getPhonePlaylists();
  
  // Estimate stored payload size in KB
  let sizeBytes = 0;
  if (typeof window !== 'undefined') {
    for (const key of Object.values(STORAGE_KEYS)) {
      const item = localStorage.getItem(key);
      if (item) sizeBytes += item.length * 2; // UTF-16 approximate
    }
  }
  const sizeKB = (sizeBytes / 1024).toFixed(1);

  return {
    savedSongsCount: tracks.length,
    likedCount: liked.length,
    playlistsCount: playlists.length,
    storageSizeKB: `${sizeKB} KB`
  };
}

// ─── 2. Playlists Storage ──────────────────────────────────────────

export function getPhonePlaylists(defaultPlaylists = []) {
  return readStorage(STORAGE_KEYS.PLAYLISTS, defaultPlaylists);
}

export function savePhonePlaylists(playlists) {
  return writeStorage(STORAGE_KEYS.PLAYLISTS, playlists);
}

// ─── 3. Liked Songs ────────────────────────────────────────────────

export function getPhoneLikedSongs(defaultIds = ['track-1', 'track-2']) {
  return readStorage(STORAGE_KEYS.LIKED, defaultIds);
}

export function savePhoneLikedSongs(ids) {
  return writeStorage(STORAGE_KEYS.LIKED, ids);
}

// ─── 4. Recently Played History ────────────────────────────────────

export function getRecentlyPlayed() {
  return readStorage(STORAGE_KEYS.RECENT, []);
}

export function addRecentlyPlayed(track, maxItems = 30) {
  if (!track || !track.id) return;
  const list = getRecentlyPlayed().filter(t => t.id !== track.id);
  const updated = [track, ...list].slice(0, maxItems);
  writeStorage(STORAGE_KEYS.RECENT, updated);
}

// ─── 5. Per-song custom cover images ───────────────────────────────

export function songCoverStorageKey(track) {
  if (!track) return '';
  if (track.id) return `id:${String(track.id)}`;
  const title = String(track.title || '').toLowerCase().trim();
  const artist = String(track.artist || track.singers || '').toLowerCase().trim();
  if (!title) return '';
  return `t:${title}::${artist}`;
}

export function getSongCoverOverrides() {
  const raw = readStorage(STORAGE_KEYS.SONG_COVERS, {});
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}

export function setSongCoverOverride(track, imageUrl) {
  const key = songCoverStorageKey(track);
  if (!key) return false;
  const map = { ...getSongCoverOverrides() };
  if (!imageUrl) {
    delete map[key];
  } else {
    map[key] = imageUrl;
  }
  // Title key backup so cover survives id changes from live API remaps
  const title = String(track?.title || '').toLowerCase().trim();
  if (title) {
    const titleKey = `title:${title}`;
    if (!imageUrl) delete map[titleKey];
    else map[titleKey] = imageUrl;
  }
  return writeStorage(STORAGE_KEYS.SONG_COVERS, map);
}

/** Resolve display cover: custom upload → track.coverUrl → fallback */
export function getSongCoverUrl(track, fallback = '') {
  if (!track) return fallback || '';
  const map = getSongCoverOverrides();
  const key = songCoverStorageKey(track);
  if (key && map[key]) return map[key];
  const title = String(track.title || '').toLowerCase().trim();
  if (title && map[`title:${title}`]) return map[`title:${title}`];
  return track.coverUrl || track.image || fallback || '';
}
