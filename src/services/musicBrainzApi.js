/**
 * MusicBrainz API Service (Open Music Metadata & Encyclopedia)
 * Base URL: https://musicbrainz.org/ws/2
 * Cover Art Archive: https://coverartarchive.org
 *
 * Requirements:
 * - Free for non-commercial use
 * - No API key required
 * - Polite rate limit: ~1 request per second
 * - Descriptive User-Agent header is MANDATORY
 */

const BASE_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'SpotifyClone/1.0.0 ( contact@freetouse.com )';

// Rate limiting queue: guarantees at least 1000ms between calls
let lastRequestTime = 0;
async function rateLimitedFetch(url, options = {}) {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < 1050) {
    await new Promise((resolve) => setTimeout(resolve, 1050 - timeSinceLast));
  }
  lastRequestTime = Date.now();

  const headers = {
    Accept: 'application/json',
    'User-Agent': USER_AGENT,
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    throw new Error(`MusicBrainz HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Search artists by name or query
 * @param {string} query - Artist name
 * @param {number} limit - Maximum results (default 10)
 */
export async function searchMusicBrainzArtists(query, limit = 10) {
  if (!query || !query.trim()) return [];
  try {
    const encoded = encodeURIComponent(query.trim());
    const data = await rateLimitedFetch(
      `${BASE_URL}/artist/?query=${encoded}&fmt=json&limit=${limit}`
    );
    if (!data.artists) return [];

    return data.artists.map((artist) => ({
      id: artist.id,
      name: artist.name,
      sortName: artist['sort-name'],
      type: artist.type || 'Artist',
      country: artist.country || 'Unknown',
      disambiguation: artist.disambiguation || '',
      lifeSpan: artist['life-span'] || {},
      tags: (artist.tags || []).map((t) => t.name),
      score: artist.score
    }));
  } catch (err) {
    console.warn('MusicBrainz searchArtists error:', err.message);
    return [];
  }
}

/**
 * Get detailed artist profile with relationships and releases
 * @param {string} mbid - MusicBrainz Artist ID
 */
export async function getMusicBrainzArtistDetails(mbid) {
  if (!mbid) return null;
  try {
    const data = await rateLimitedFetch(
      `${BASE_URL}/artist/${mbid}?inc=url-rels+release-groups+tags&fmt=json`
    );
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      country: data.country,
      disambiguation: data.disambiguation,
      lifeSpan: data['life-span'],
      tags: (data.tags || []).map((t) => t.name),
      externalLinks: (data.relations || [])
        .filter((rel) => rel.url?.resource)
        .map((rel) => ({
          type: rel.type,
          url: rel.url.resource
        })),
      releaseGroups: (data['release-groups'] || []).map((rg) => ({
        id: rg.id,
        title: rg.title,
        primaryType: rg['primary-type'],
        firstReleaseDate: rg['first-release-date']
      }))
    };
  } catch (err) {
    console.warn('MusicBrainz getArtistDetails error:', err.message);
    return null;
  }
}

/**
 * Search tracks (recordings) by title and optional artist
 */
export async function searchMusicBrainzRecordings(title, artist = '', limit = 10) {
  if (!title || !title.trim()) return [];
  try {
    let queryStr = `recording:"${title.trim()}"`;
    if (artist && artist.trim()) {
      queryStr += ` AND artist:"${artist.trim()}"`;
    }
    const encoded = encodeURIComponent(queryStr);
    const data = await rateLimitedFetch(
      `${BASE_URL}/recording/?query=${encoded}&fmt=json&limit=${limit}`
    );
    if (!data.recordings) return [];

    return data.recordings.map((rec) => ({
      id: rec.id,
      title: rec.title,
      artist: rec['artist-credit']?.map((c) => c.name).join(', ') || 'Unknown',
      artistMbid: rec['artist-credit']?.[0]?.artist?.id,
      lengthMs: rec.length,
      durationStr: rec.length
        ? `${Math.floor(rec.length / 60000)}:${String(Math.floor((rec.length % 60000) / 1000)).padStart(2, '0')}`
        : 'Unknown',
      releases: (rec.releases || []).map((r) => ({
        id: r.id,
        title: r.title,
        date: r.date,
        country: r.country
      })),
      isrcs: rec.isrcs || [],
      score: rec.score
    }));
  } catch (err) {
    console.warn('MusicBrainz searchRecordings error:', err.message);
    return [];
  }
}

/**
 * Fetch high-resolution cover art from Cover Art Archive
 * @param {string} releaseMbid - Release MBID
 */
export async function getCoverArtArchive(releaseMbid) {
  if (!releaseMbid) return null;
  try {
    const res = await fetch(`https://coverartarchive.org/release/${releaseMbid}`);
    if (!res.ok) return null;
    const data = await res.json();
    const front = data.images?.find((img) => img.front) || data.images?.[0];
    return front?.thumbnails?.['500'] || front?.image || null;
  } catch {
    return null;
  }
}

/**
 * Enrich existing track with open-access encyclopedic metadata
 * Returns artist MBID, release year, country, tags/genres, and verified ISRCs
 */
export async function enrichTrackMetadata(title, artist = '') {
  try {
    const matches = await searchMusicBrainzRecordings(title, artist, 1);
    if (!matches || matches.length === 0) return null;

    const topMatch = matches[0];
    let coverArt = null;
    if (topMatch.releases?.[0]?.id) {
      coverArt = await getCoverArtArchive(topMatch.releases[0].id);
    }

    return {
      musicBrainzId: topMatch.id,
      verifiedTitle: topMatch.title,
      verifiedArtist: topMatch.artist,
      artistMbid: topMatch.artistMbid,
      releaseTitle: topMatch.releases?.[0]?.title,
      releaseDate: topMatch.releases?.[0]?.date,
      country: topMatch.releases?.[0]?.country,
      isrc: topMatch.isrcs?.[0] || null,
      coverArt
    };
  } catch (err) {
    console.warn('Metadata enrichment error:', err.message);
    return null;
  }
}
