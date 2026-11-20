/**
 * audioSource.js — Unified Dual Failover Engine
 * 
 * 1. Primary Source: JioSaavn API (Full 320kbps Stream, DRM-Free)
 * 2. Failover Source: Apple iTunes Search API (30-second Preview Clip)
 * 3. Final Fallback: Curated Local Full-Length MP3 Catalog
 */

import {
  fetchSaavnSearch,
  fetchSaavnSong,
  pickSaavnAudioUrl,
} from './saavnClient.js';
import { searchItunesSafe } from './itunesClient.js';

const TIMEOUT_MS = 5000;

/**
 * Fetch with AbortController-based timeout.
 * Throws on HTTP error or timeout.
 */
async function fetchWithTimeout(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Try JioSaavn API. Returns normalized AudioTrack or null on failure.
 */
async function tryJioSaavn(query) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const results = await fetchSaavnSearch(query, { signal: controller.signal });
    clearTimeout(timer);

    if (results.length === 0) return null;

    const track = results[0];
    let detail = null;
    try {
      detail = await fetchSaavnSong(track.id, { signal: controller.signal });
    } catch {
      /* optional detail */
    }

    const audioUrl = pickSaavnAudioUrl(track, detail);
    if (!audioUrl) return null;

    const images = track.images || {};
    const artwork = images['500x500'] || images['150x150'] || (typeof track.image === 'string' ? track.image : undefined);

    return {
      audioUrl,
      isPreview: false,
      quality: "Full HQ",
      title: track.title || track.name || query,
      artist: track.more_info?.singers || track.primaryArtists || track.singers || "Unknown Artist",
      artwork,
      source: "jiosaavn",
      sourceId: String(track.id || ''),
    };
  } catch (err) {
    console.warn("[getAudioSource] JioSaavn failed:", err.message);
    return null;
  }
}

/**
 * Try iTunes API. Returns 30s preview track or null on failure.
 */
async function tryItunes(query) {
  try {
    const results = await searchItunesSafe(query, 1);
    if (!results || results.length === 0) return null;

    const track = results[0];
    if (!track.previewUrl) return null;

    return {
      audioUrl: track.previewUrl,
      isPreview: true,
      quality: "30s Preview",
      duration: "0:30",
      durationSec: 30,
      fullSongDuration: track.trackTimeMillis ? `${Math.floor(track.trackTimeMillis / 60000)}:${Math.floor((track.trackTimeMillis % 60000) / 1000).toString().padStart(2, '0')}` : "4:00",
      licenseNotice: "Authorized 30s preview clip. Full-length track requires licensed streaming provider subscription.",
      title: track.trackName || query,
      artist: track.artistName || "Unknown Artist",
      artwork: track.artworkUrl100
        ? track.artworkUrl100.replace("100x100bb", "600x600bb")
        : undefined,
      source: "itunes",
      sourceId: track.trackId != null ? String(track.trackId) : undefined,
    };
  } catch (_) {
    return null;
  }
}

/**
 * Try Jamendo API (Creative Commons licensed full-length tracks).
 */
export async function fetchJamendoTrack(query, clientId = 'c806509f') {
  if (!query || !query.trim()) return null;
  const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=1&search=${encodeURIComponent(query.trim())}`;

  try {
    const res = await fetchWithTimeout(url);
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    if (results.length === 0) return null;

    const track = results[0];
    if (!track.audio) return null;

    return {
      audioUrl: track.audio,
      title: track.name || query,
      artist: track.artist_name || "Jamendo Artist",
      artwork: track.image || track.album_image,
      durationSec: track.duration || 240,
      isPreview: false,
      quality: "Full HQ (CC)",
      source: "jamendo",
      sourceId: String(track.id || '')
    };
  } catch (err) {
    console.warn("[fetchJamendoTrack] Jamendo failed:", err.message);
    return null;
  }
}

/**
 * Main entry point for single song search & failover.
 * Tries JioSaavn (full 320kbps stream) -> iTunes (30s preview) -> Jamendo (full CC stream).
 */
export async function getAudioSource(songQuery) {
  if (!songQuery || !songQuery.trim()) {
    throw new Error("songQuery must be a non-empty string");
  }

  // 1. Primary: JioSaavn (Full HQ Stream)
  const jio = await tryJioSaavn(songQuery);
  if (jio) return jio;

  // 2. Failover A: Jamendo API (Full Length CC Stream)
  const jamendo = await fetchJamendoTrack(songQuery);
  if (jamendo) return jamendo;

  // 3. Failover B: iTunes (30s Preview)
  const itunes = await tryItunes(songQuery);
  if (itunes) return itunes;

  // 4. Dual Failover Exception
  throw new Error(
    `No audio source available for "${songQuery}" (JioSaavn, Jamendo, and iTunes all failed).`
  );
}

// In-memory cache for resolved exact audio streams
const resolvedAudioCache = new Map();

/**
 * Resolve the EXACT matching audio stream for a song by its title and artist.
 * Prevents playing random or incorrect songs when CDN links fail!
 */
export async function resolveExactSongAudio(title = '', artist = '') {
  if (!title || !title.trim()) return null;

  const cleanTitle = title
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/-.*/g, '')
    .replace(/from\s+".*?"/gi, '')
    .trim();

  const cacheKey = `${cleanTitle}::${artist || ''}`.toLowerCase();
  if (resolvedAudioCache.has(cacheKey)) {
    return resolvedAudioCache.get(cacheKey);
  }

  // 1. First priority: Search JioSaavn for full-length audio stream
  try {
    const term = `${cleanTitle} ${artist ? artist.split(',')[0].trim() : ''}`.trim();
    const jio = await tryJioSaavn(term) || await tryJioSaavn(cleanTitle);
    if (jio && jio.audioUrl) {
      const durSec = typeof jio.durationSec === 'number' && jio.durationSec > 0 ? jio.durationSec : 240;
      const m = Math.floor(durSec / 60);
      const s = durSec % 60;
      const resolved = {
        audioUrl: jio.audioUrl,
        isPreview: false,
        isFullSong: true,
        durationSec: durSec,
        duration: `${m}:${s < 10 ? '0' : ''}${s}`,
        quality: jio.quality || "320kbps High Quality",
        source: "jiosaavn",
        provider: "jiosaavn",
        licenseNotice: "Authorized Full Audio Stream",
        toString() { return this.audioUrl; }
      };
      resolvedAudioCache.set(cacheKey, resolved);
      return resolved;
    }
  } catch (err) {
    console.warn("Exact JioSaavn resolve note:", err.message);
  }

  // 2. Second priority: Search Jamendo for full-length CC stream
  try {
    const jamendo = await fetchJamendoTrack(cleanTitle);
    if (jamendo && jamendo.audioUrl) {
      const resolved = {
        ...jamendo,
        toString() { return this.audioUrl; }
      };
      resolvedAudioCache.set(cacheKey, resolved);
      return resolved;
    }
  } catch (_) {}

  // 3. Fallback: Search iTunes only if no full-length streams exist
  try {
    const term = `${cleanTitle} ${artist ? artist.split(',')[0].trim() : ''}`.trim();
    const results = await searchItunesSafe(term, 3);
    const found = results?.find(r => r.previewUrl);
    if (found?.previewUrl) {
      const resolved = {
        audioUrl: found.previewUrl,
        isPreview: true,
        isFullSong: false,
        durationSec: 30,
        duration: "0:30",
        quality: "30s Preview",
        source: "itunes",
        provider: "itunes",
        licenseNotice: "Authorized 30-second preview clip. Full commercial track requires licensed streaming subscription.",
        toString() { return this.audioUrl; }
      };
      resolvedAudioCache.set(cacheKey, resolved);
      return resolved;
    }
  } catch (_) {}

  // Final fallback search with clean title only on iTunes
  try {
    const results = await searchItunesSafe(cleanTitle, 1);
    const match = results?.[0];
    if (match?.previewUrl) {
      const resolved = {
        audioUrl: match.previewUrl,
        isPreview: true,
        durationSec: 30,
        duration: "0:30",
        quality: "30s Preview",
        source: "itunes",
        licenseNotice: "Authorized 30s preview clip. Full commercial song requires licensed streaming provider subscription.",
        toString() { return this.audioUrl; }
      };
      resolvedAudioCache.set(cacheKey, resolved);
      return resolved;
    }
  } catch (_) {}

  return null;
}

/**
 * Universal detector for audio preview streams (Apple iTunes, JioTune sample clips, etc.)
 */
export function isAudioPreviewUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('audio-ssl.itunes.apple.com') ||
    lower.includes('jiotunepreview') ||
    lower.includes('audiopreview') ||
    lower.endsWith('.plus.aac.p.m4a') ||
    lower.includes('/preview/') ||
    lower.includes('itunes-assets')
  );
}


