/**
 * Jamendo API Service (Creative Commons Music Catalog & Streaming)
 * Official Portal: https://developer.jamendo.com/v3.0
 * Features: 500,000+ legal, free Creative Commons MP3 tracks, albums, and radio streams
 *
 * Requirements:
 * - Free developer account at https://devportal.jamendo.com/
 * - Client ID passed as `client_id` parameter
 */

const BASE_URL = 'https://api.jamendo.com/v3.0';

// Configurable client ID via environment variable or runtime config
export const getJamendoClientId = () => {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_JAMENDO_CLIENT_ID) ||
    'a55543be'
  );
};

/**
 * Format raw Jamendo track to the unified player track schema
 */
export function formatJamendoTrack(track) {
  if (!track) return null;

  const rawDuration = typeof track.duration === 'number' ? track.duration : 180;
  const mins = Math.floor(rawDuration / 60);
  const secs = rawDuration % 60;
  const durationStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const audioUrl = track.audio || track.audiodownload || '';
  const coverUrl =
    track.image ||
    track.album_image ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

  const tags = track.musicinfo?.tags
    ? [
        ...(track.musicinfo.tags.genres || []),
        ...(track.musicinfo.tags.instruments || []),
        ...(track.musicinfo.tags.vartags || [])
      ]
    : [];

  const genre = track.musicinfo?.tags?.genres?.[0] || 'Creative Commons';

  return {
    id: `jamendo-${track.id}`,
    rawId: track.id,
    title: track.name || 'Untitled Track',
    artist: track.artist_name || 'Independent Artist',
    artistId: track.artist_id,
    album: track.album_name || `${genre} • Jamendo`,
    albumId: track.album_id,
    duration: durationStr,
    durationSec: rawDuration,
    audioUrl,
    downloadUrl: track.audiodownload || audioUrl,
    coverUrl,
    genre,
    tags,
    plays: track.stats?.rate_listened_total
      ? `${track.stats.rate_listened_total.toLocaleString()}`
      : 'Popular',
    releaseDate: track.releasedate ? track.releasedate.substring(0, 4) : '2024',
    license: track.license_ccurl || 'https://creativecommons.org/licenses/by/4.0/',
    category: 'songs',
    source: 'jamendo',
    isJamendo: true,
    isLiveApi: true,
    isFullSong: true,
    isPreview: false,
    quality: 'Creative Commons 192kbps MP3',
    waveform: [],
    attribution: `Track: "${track.name}" by ${track.artist_name}\nLicense: ${track.license_ccurl || 'Creative Commons'}\nStream & Download via Jamendo: ${track.shareurl || 'https://www.jamendo.com'}`
  };
}

/**
 * Search tracks on Jamendo by query, tags, speed, and order
 * @param {Object} options - Search options
 */
export async function searchJamendoTracks({
  query = '',
  tags = '',
  limit = 30,
  offset = 0,
  order = 'popularity_total', // 'popularity_total', 'releasedate_desc', 'buzzrate'
  clientId = getJamendoClientId()
} = {}) {
  try {
    const params = new URLSearchParams({
      client_id: clientId,
      format: 'json',
      limit: String(limit),
      offset: String(offset),
      order,
      include: 'musicinfo+stats',
      audioformat: 'mp32'
    });

    if (query && query.trim()) {
      params.append('namesearch', query.trim());
    }
    if (tags && tags.trim()) {
      params.append('tags', tags.trim());
    }

    const res = await fetch(`${BASE_URL}/tracks/?${params.toString()}`);
    if (!res.ok) throw new Error(`Jamendo API HTTP ${res.status}`);

    const data = await res.json();
    if (data.headers?.status === 'failed') {
      console.warn('Jamendo API warning:', data.headers.error_message);
      return { tracks: [], count: 0, error: data.headers.error_message };
    }

    const tracks = (data.results || [])
      .map(formatJamendoTrack)
      .filter((t) => t && t.audioUrl);

    return {
      tracks,
      count: data.headers?.results_count || tracks.length
    };
  } catch (err) {
    console.warn('searchJamendoTracks error:', err.message);
    return { tracks: [], count: 0, error: err.message };
  }
}

/**
 * Fetch top trending/popular tracks by genre/tag
 */
export async function fetchJamendoPopularTracks({
  tags = '',
  limit = 30,
  order = 'popularity_total',
  clientId = getJamendoClientId()
} = {}) {
  return searchJamendoTracks({ tags, limit, order, clientId });
}

/**
 * Fetch a single track by its Jamendo track ID
 */
export async function fetchJamendoTrackById(trackId, clientId = getJamendoClientId()) {
  if (!trackId) return null;
  const cleanId = String(trackId).replace('jamendo-', '');

  try {
    const params = new URLSearchParams({
      client_id: clientId,
      format: 'json',
      id: cleanId,
      include: 'musicinfo+stats',
      audioformat: 'mp32'
    });

    const res = await fetch(`${BASE_URL}/tracks/?${params.toString()}`);
    if (!res.ok) throw new Error(`Jamendo API HTTP ${res.status}`);

    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;

    return formatJamendoTrack(data.results[0]);
  } catch (err) {
    console.warn('fetchJamendoTrackById error:', err.message);
    return null;
  }
}

/**
 * Search artists on Jamendo
 */
export async function searchJamendoArtists({
  query = '',
  limit = 20,
  clientId = getJamendoClientId()
} = {}) {
  try {
    const params = new URLSearchParams({
      client_id: clientId,
      format: 'json',
      limit: String(limit),
      order: 'popularity_total'
    });

    if (query && query.trim()) {
      params.append('namesearch', query.trim());
    }

    const res = await fetch(`${BASE_URL}/artists/?${params.toString()}`);
    if (!res.ok) throw new Error(`Jamendo API HTTP ${res.status}`);

    const data = await res.json();
    if (!data.results) return [];

    return data.results.map((a) => ({
      id: a.id,
      name: a.name,
      website: a.website,
      image: a.image,
      shareurl: a.shareurl
    }));
  } catch (err) {
    console.warn('searchJamendoArtists error:', err.message);
    return [];
  }
}
