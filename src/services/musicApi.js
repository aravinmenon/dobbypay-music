/**
 * Indian Music API Service — Powered by JioSaavn API + iTunes Failover Engine
 * Primary Source: JioSaavn v3 API
 * Backup Source: iTunes Search API
 * Final Fallback: Curated Indian Vocal Tracks Pool
 * Logic: If JioSaavn fails, iTunes works. If iTunes fails, JioSaavn works.
 * Supports: Tamil, Malayalam, Telugu, Kannada, Hindi, English
 */

import { CURATED_TRACKS, filterTracks, ALL_DIRECTORS } from '../data/indianMusicData.js';
import {
  fetchSaavnSearch,
  fetchSaavnSong,
  pickSaavnAudioUrl,
  parseDurationSeconds,
} from './saavnClient.js';
import { searchItunesSafe } from './itunesClient.js';
import { apiFetch } from './authService.js';
export { getAudioSource } from './audioSource.js';
export { fetchSaavnLyrics, lyricsPayloadToLines } from './saavnClient.js';
export {
  fetchFreeToUseTracks,
  searchFreeToUseTracks,
  fetchFreeToUseCategories,
  fetchFreeToUseCategoryTracks,
  fetchFreeToUseArtists,
  fetchFreeToUseArtistTracks,
  fetchFreeToUseTrackById,
  fetchFreeToUseRelatedTracks,
  formatFreeToUseTrack
} from './freeToUseApi.js';
import { searchFreeToUseTracks } from './freeToUseApi.js';
export {
  searchMusicBrainzArtists,
  getMusicBrainzArtistDetails,
  searchMusicBrainzRecordings,
  getCoverArtArchive,
  enrichTrackMetadata
} from './musicBrainzApi.js';
export {
  searchJamendoTracks,
  fetchJamendoPopularTracks,
  fetchJamendoTrackById,
  searchJamendoArtists,
  formatJamendoTrack
} from './jamendoApi.js';



// ─── Real Indian Vocal Fallback Pool (Permanent Full Length MP3 Streams) ───
const REAL_VOCAL_FALLBACK_POOL = [
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/A-Love-Blossoms-Instrumental.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aaacha-Paatcha-MassTamilan.com.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aada%20Sonnaal.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadaatha-Manamum-MassTamilan.fm.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadi%20Sivan%20Tholil%20Irukkum.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadi-Varattum-MassTamilan.com.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadi_Pattam.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadi_Pizhaithaalum_Paadi_Pizhaithaalum_%5BMassWala.Com%5D.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadidu%20Peyygaley.mp3",
  "https://archive.org/download/anirudh-hit-songs-tamil-128k/Aadiyae-Attam-Enna-MassTamilan.fm.mp3"
];

/**
 * Search songs via JioSaavn (local /api/saavn proxy in dev) — stream URLs + metadata
 */
export async function searchFromJioSaavn(query, limit = 30, language = 'all') {
  if (!query || !query.trim()) return [];

  try {
    const controller = new AbortController();
    const pagesNeeded = limit > 40 ? 2 : 1;
    const timeoutMs = pagesNeeded > 1 ? 22000 : 14000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const items = (await fetchSaavnSearch(query, {
      language,
      signal: controller.signal,
      pages: pagesNeeded,
    })).slice(0, limit);
    clearTimeout(timeoutId);

    if (!items.length) return [];

    const validTracks = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rawAudio = item.media_url || pickSaavnAudioUrl(item);
      const validAudioUrl = rawAudio || null;

      const realSec = parseDurationSeconds(item, 0);
      const validDurationSec = realSec > 0 ? realSec : (typeof item.duration === 'number' && item.duration > 0 ? item.duration : 240);
      const mins = Math.floor(validDurationSec / 60);
      const secs = validDurationSec % 60;
      const durationStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

      const images = item.images || {};
      const coverUrl = images['500x500'] || images['150x150'] || item.image || getDefaultCover(i);

      const cleanTitle = cleanHtmlEntities(item.title || item.song || 'Untitled Track');
      const cleanArtist = cleanHtmlEntities(
        item.artist || item.more_info?.singers || item.more_info?.primary_artists || item.description || 'Unknown Artist'
      );
      const cleanAlbum = cleanHtmlEntities(item.more_info?.album || item.album || 'Unknown Album');
      const saavnId = String(item.id || '');

      const singers = cleanArtist.includes('-') ? cleanArtist.split('-')[0].trim() : cleanArtist;
      const director = extractDirectorName(cleanArtist, cleanAlbum, query);
      const songLanguage = (item.language || item.more_info?.language || language || 'tamil').toLowerCase();

      validTracks.push({
        id: `saavn-${saavnId}-${Date.now()}-${i}`,
        saavnId,
        title: cleanTitle,
        artist: cleanArtist,
        singers,
        director,
        composer: director,
        album: cleanAlbum,
        film: cleanAlbum,
        lyricist: item.more_info?.lyricist || 'Tamil / Indian Lyricist',
        duration: durationStr,
        durationSec: validDurationSec,
        audioUrl: validAudioUrl,
        coverUrl,
        genre: songLanguage ? `${capitalize(songLanguage)} Hit` : 'Indian Hit',
        plays: `${(Math.floor(Math.random() * 85) + 18).toLocaleString()},000`,
        releaseDate: item.year || item.more_info?.year || '2024',
        color: getRandomColor(i),
        language: songLanguage,
        category: 'songs',
        isLiveApi: true,
        isFullSong: true,
        isPreview: false,
        quality: '320kbps High Quality',
        source: 'jiosaavn',
      });
    }

    return validTracks;
  } catch (error) {
    console.warn('JioSaavn API error:', error.message);
    return [];
  }
}

// ─── iTunes Search API (AUTOMATIC FAILOVER SOURCE) ────────────────
/**
 * Search songs via iTunes — reliable failover when JioSaavn fails or returns 0 results
 */
export async function searchFromItunes(query, limit = 30) {
  if (!query || !query.trim()) return [];

  try {
    const results = await searchItunesSafe(query.trim(), limit);
    if (!results || !results.length) return [];

    return results.map((item, index) => {
      const rawSecs = Math.floor((item.trackTimeMillis || 240000) / 1000);
      const durationSec = rawSecs > 30 ? rawSecs : 240;
      const minutes = Math.floor(durationSec / 60);
      const seconds = durationSec % 60;

      const hdCover = item.artworkUrl100
        ? item.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg')
        : getDefaultCover(index);

      const cleanTitle = cleanHtmlEntities(item.trackName || "Untitled Track");
      const cleanArtist = cleanHtmlEntities(item.artistName || "Unknown Artist");
      const cleanAlbum = cleanHtmlEntities(item.collectionName || item.trackName || "Unknown Album");

      return {
        id: `itunes-${item.trackId || index}-${Date.now()}`,
        title: cleanTitle,
        artist: cleanArtist,
        director: extractDirectorName(cleanArtist, cleanAlbum, query),
        album: cleanAlbum,
        duration: "0:30",
        durationSec: 30,
        fullSongDuration: `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`,
        audioUrl: item.previewUrl || null,
        coverUrl: hdCover,
        genre: item.primaryGenreName || "Indian Hit",
        plays: `${(Math.floor(Math.random() * 85) + 18).toLocaleString()},000`,
        releaseDate: item.releaseDate?.substring(0, 4) || "2024",
        color: getRandomColor(index),
        language: inferLanguage(query),
        category: "songs",
        isLiveApi: true,
        isFullSong: false,
        isPreview: true,
        quality: '30s Preview',
        licenseNotice: 'Authorized 30s preview clip. Full-length streaming requires licensed provider.',
        source: 'itunes'
      };
    });
  } catch (error) {
    console.warn("iTunes API error:", error.message);
    return [];
  }
}

// ─── FreeToUse.com API (Royalty-Free & High-Fidelity Music Engine) ───
/**
 * Search tracks via FreeToUse.com API (100% royalty-free, full 320kbps MP3s)
 */
export async function searchFromFreeToUse(query, limit = 30) {
  if (!query || !query.trim()) return [];
  try {
    const res = await searchFreeToUseTracks(query, { limit });
    return res.tracks || [];
  } catch (err) {
    console.warn("FreeToUse search error:", err.message);
    return [];
  }
}

// ─── DobbyPay Express Songs Catalog API (/api/songs) ───────
export async function searchFromProductionSongsApi(query, limit = 40, language = 'all') {
  if (!query || !query.trim()) return [];
  try {
    const params = new URLSearchParams({
      search: query.trim(),
      limit: String(limit),
    });
    if (language && language !== 'all') params.set('language', language);

    const res = await apiFetch(`songs?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      const songs = data?.songs || data?.results;
      if (Array.isArray(songs) && songs.length > 0) {
        return songs.map((s, idx) => ({
          id: s.id || `prod-${idx}-${Date.now()}`,
          title: s.title || 'Untitled Track',
          artist: s.artist || s.singers || 'Unknown Artist',
          director: s.director || s.director_name || 'Music Director',
          album: s.album || s.film || 'Single',
          duration: s.duration || '3:30',
          durationSec: s.durationSec || s.duration_sec || 210,
          audioUrl: s.audioUrl || s.audio_url,
          coverUrl: s.coverUrl || s.cover_url || getDefaultCover(idx),
          language: s.language || s.language_id || 'tamil',
          isFullSong: true,
          isPreview: Boolean(s.isPreview),
        }));
      }
    }
  } catch (err) {
    console.warn('Express /api/songs search notice:', err.message);
  }
  return [];
}

// ─── Unified Search — Multi-Source Failover: JioSaavn ↔ iTunes ↔ FreeToUse → Local ──────
/**
 * Primary search function:
 * 1. Try JioSaavn API first.
 * 2. Try DobbyPay Production Songs Catalog API.
 * 3. If JioSaavn fails or returns 0 results, automatically try iTunes API!
 * 4. Also check FreeToUse.com API for royalty-free & global tracks.
 * 5. Fall back to Curated Local Tracks!
 */
export async function searchSongsFromApi(query, limit = 40, language = 'all') {
  if (!query || !query.trim()) return [];

  // Step 1: Try JioSaavn API first
  try {
    const saavnResults = await searchFromJioSaavn(query, limit, language);
    if (saavnResults && saavnResults.length > 0) {
      return saavnResults;
    }
  } catch (err) {
    console.warn("JioSaavn API failed, switching to fallback:", err.message);
  }

  // Step 2: Try DobbyPay Production MySQL Songs API
  try {
    const prodResults = await searchFromProductionSongsApi(query, limit, language);
    if (prodResults && prodResults.length > 0) {
      return prodResults;
    }
  } catch (err) {
    console.warn("Production Songs API fallback notice:", err.message);
  }

  // Step 2: Try iTunes API
  try {
    const itunesResults = await searchFromItunes(query, limit);
    if (itunesResults && itunesResults.length > 0) {
      return itunesResults;
    }
  } catch (err) {
    console.warn("iTunes API fallback also failed:", err.message);
  }

  // Step 3: Try FreeToUse.com API
  try {
    const ftuResults = await searchFromFreeToUse(query, limit);
    if (ftuResults && ftuResults.length > 0) {
      return ftuResults;
    }
  } catch (err) {
    console.warn("FreeToUse API search failed:", err.message);
  }

  // Step 4: Final fallback to curated local tracks
  return filterTracks({ searchQuery: query }).slice(0, limit);
}

/**
 * Search by language and decade — with JioSaavn ↔ iTunes failover + local fallback
 */
export async function searchByLanguageAndDecade(language = 'all', decade = 'all', category = 'all', limit = 50) {
  const languageQueries = {
    tamil: "tamil hit songs",
    telugu: "telugu hit songs",
    malayalam: "malayalam hit songs",
    kannada: "kannada hit songs",
    hindi: "hindi bollywood hit songs",
    punjabi: "punjabi hit songs",
    bengali: "bengali hit songs",
    marathi: "marathi hit songs",
    english: "english pop hit songs"
  };

  const decadeQueries = {
    '1980s': '1980s',
    '1990s': '1990s',
    '2000s': '2000s',
    '2010s': '2010s',
    '2020s': '2020s latest new'
  };

  let queryParts = [];
  if (language !== 'all') queryParts.push(languageQueries[language] || language);
  if (decade !== 'all') queryParts.push(decadeQueries[decade] || '');
  if (category === 'bgm') queryParts.push('bgm background score theme');
  const apiQuery = queryParts.join(' ').trim();

  if (apiQuery) {
    const apiResults = await searchSongsFromApi(apiQuery, limit, language);
    if (apiResults.length > 0) return apiResults;
  }

  return filterTracks({ language, decade, category }).slice(0, limit);
}

/**
 * Normalize song title for unique display — strips (From "Album"), brackets, quotes.
 * "Ala Bolelo (From \"Jailer 2\")" and "Ala Bolelo" → same key.
 */
export function normalizeUniqueSongTitle(title = '') {
  return cleanHtmlEntities(String(title || ''))
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/['"''']/g, '')
    .replace(/\s*[-–—]\s*(from|movie|ost|original).*$/i, '')
    .replace(/[^a-z0-9\u0b80-\u0bff\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** One list entry per song title (album/version variants collapsed). */
export function uniqueSongKey(track) {
  const title = normalizeUniqueSongTitle(track?.title);
  if (title) return `title:${title}`;
  if (track?.saavnId) return `saavn:${track.saavnId}`;
  if (track?.id) return `id:${track.id}`;
  return '';
}

function trackQualityScore(track) {
  let score = 0;
  if (track?.audioUrl && !track?.isPreview) score += 40;
  if (track?.isFullSong) score += 20;
  if (track?.audioUrl) score += 10;
  if ((track?.durationSec || 0) > 60) score += 5;
  if (track?.coverUrl) score += 1;
  return score;
}

/**
 * Collapse remasters / "From Album" rows into a single song, keeping the best stream.
 */
export function dedupeTracksBySong(tracks = []) {
  const bestByKey = new Map();
  for (const track of tracks || []) {
    if (!track) continue;
    const key = uniqueSongKey(track);
    if (!key) continue;
    const prev = bestByKey.get(key);
    if (!prev || trackQualityScore(track) > trackQualityScore(prev)) {
      bestByKey.set(key, track);
    }
  }
  return [...bestByKey.values()];
}

function directorTrackKey(track) {
  return uniqueSongKey(track);
}

function buildDirectorQueries(cleanName, effectiveLang) {
  const name = cleanName.trim();
  const lang = (effectiveLang || 'tamil').toLowerCase();
  const lower = name.toLowerCase();

  const specialty = {
    rahman: [
      'A.R. Rahman Tamil Hits',
      'AR Rahman Tamil Movie Songs',
      'A.R. Rahman 90s Tamil Songs',
      'AR Rahman 2000s Hits',
      'AR Rahman Melody Tamil',
      'Ponniyin Selvan AR Rahman',
      'Sivaji Enthiran AR Rahman',
      'Roja Bombay Dil Se AR Rahman',
      'AR Rahman Bollywood Hits',
      'AR Rahman Best Movie Songs',
      'AR Rahman All Songs',
    ],
    santhosh: [
      'Santhosh Narayanan Tamil Hits',
      'Santhosh Narayanan Movie Songs',
      'Santhosh Narayanan Melody Hits',
      'Kabali Santhosh Narayanan',
      'Sarpatta Parambarai Santhosh Narayanan',
      'Karnan Santhosh Narayanan',
      'Vada Chennai Santhosh Narayanan',
      'Jigarthanda Santhosh Narayanan',
      'Mahaan Santhosh Narayanan',
      'Kaala Santhosh Narayanan',
      'Santhosh Narayanan All Songs',
    ],
    anirudh: [
      'Anirudh Ravichander Tamil Hits',
      'Anirudh Movie Songs',
      'Leo Jailer Vikram Anirudh',
      'Master Doctor Beast Anirudh',
      'Anirudh Melody Hits',
      'Anirudh Mass Hits',
      'Anirudh Best Songs',
      'Anirudh All Songs',
    ],
    ilaiyaraaja: [
      'Ilaiyaraaja Tamil Hits',
      'Ilaiyaraaja 80s Hits',
      'Ilaiyaraaja 90s Songs',
      'Ilaiyaraaja Melody Hits',
      'Ilaiyaraaja Movie Songs',
      'Ilayaraja Evergreen Songs',
      'Ilaiyaraaja All Songs',
    ],
    harris: [
      'Harris Jayaraj Tamil Hits',
      'Harris Jayaraj Melody Songs',
      'Harris Jayaraj Minnale Vaaranam Aayiram',
      'Harris Jayaraj Movie Songs',
      'Harris Jayaraj Best Hits',
      'Harris Jayaraj All Songs',
    ],
    yuvan: [
      'Yuvan Shankar Raja Hits',
      'Yuvan Drug Songs',
      'Yuvan Melody Songs',
      'Yuvan Shankar Raja Movie Songs',
      'Yuvan 2000s Hits',
      'Yuvan Shankar Raja Best Songs',
      'Yuvan Shankar Raja All Songs',
    ],
    dsp: [
      'Devi Sri Prasad Telugu Hits',
      'DSP Telugu Movie Songs',
      'Pushpa Devi Sri Prasad',
      'Devi Sri Prasad Tamil Hits',
      'Devi Sri Prasad Mass Hits',
      'Devi Sri Prasad All Songs',
    ],
    keeravani: [
      'MM Keeravani Telugu Hits',
      'RRR Baahubali Keeravani',
      'MM Keeravani Movie Songs',
      'Maragathamani Tamil Songs',
      'Keeravani Best Songs',
      'MM Keeravani All Songs',
    ],
    thaman: [
      'SS Thaman Telugu Hits',
      'SS Thaman Movie Songs',
      'Thaman Mass Songs',
      'Thaman Best Hits',
      'SS Thaman All Songs',
    ],
    pritam: [
      'Pritam Bollywood Hits',
      'Pritam Hindi Movie Songs',
      'Pritam Melody Hits',
      'Pritam Best Songs',
      'Pritam All Songs',
    ],
    gvp: [
      'GV Prakash Kumar Hits',
      'GV Prakash Kumar Tamil Songs',
      'GV Prakash Melody Hits',
      'Aadukalam Asuran GV Prakash',
      'GV Prakash All Songs',
    ],
  };

  let queries;
  if (lower.includes('rahman')) queries = specialty.rahman;
  else if (lower.includes('santhosh') || lower.includes('narayanan')) queries = specialty.santhosh;
  else if (lower.includes('anirudh')) queries = specialty.anirudh;
  else if (lower.includes('ilaiyaraaja') || lower.includes('ilayaraja')) queries = specialty.ilaiyaraaja;
  else if (lower.includes('harris')) queries = specialty.harris;
  else if (lower.includes('yuvan')) queries = specialty.yuvan;
  else if (lower.includes('devi sri') || lower.includes('dsp')) queries = specialty.dsp;
  else if (lower.includes('keeravani') || lower.includes('maragathamani')) queries = specialty.keeravani;
  else if (lower.includes('thaman')) queries = specialty.thaman;
  else if (lower.includes('pritam')) queries = specialty.pritam;
  else if (lower.includes('g.v.') || lower.includes('gv prakash')) queries = specialty.gvp;
  else {
    queries = [
      `${name} Hits`,
      `${name} ${lang} Hits`,
      `${name} Movie Songs`,
      `${name} Best Songs`,
      `${name} Melody Songs`,
      `${name} All Songs`,
      `${name} ${lang} songs`,
    ];
  }

  return [...new Set(queries.filter(Boolean))];
}

async function runDirectorQueriesInChunks(queries, perQueryLimit = 80) {
  const chunkSize = 3;
  const collected = [];
  for (let i = 0; i < queries.length; i += chunkSize) {
    const chunk = queries.slice(i, i + chunkSize);
    const settled = await Promise.allSettled(
      chunk.map((q) => searchFromJioSaavn(q, perQueryLimit, 'all'))
    );
    for (const result of settled) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        collected.push(...result.value);
      }
    }
  }
  return collected;
}

/**
 * Fetch complete catalog for a specific Music Director (100+ tracks)
 * Combines Curated Local Tracks + JioSaavn API + iTunes API failover
 */
export async function fetchDirectorHitsFromApi(directorName, limit = 500, language = 'all') {
  if (!directorName) return [];

  const cleanName = directorName.replace(/\(Hindi\)/i, '').trim();
  const dirObj = ALL_DIRECTORS.find(d =>
    d.name.toLowerCase() === directorName.toLowerCase() ||
    d.name.toLowerCase() === cleanName.toLowerCase() ||
    d.id.toLowerCase() === directorName.toLowerCase()
  );
  const effectiveLang = (language && language !== 'all' ? language : (dirObj?.language || 'tamil')).toLowerCase();
  const maxTracks = Math.max(50, Number(limit) || 500);

  const bestByKey = new Map();

  const pushTrack = (track, forceDirector = true) => {
    if (!track) return;
    const key = directorTrackKey(track);
    if (!key) return;
    const normalized = {
      ...track,
      director: forceDirector ? (track.director || directorName) : track.director,
      composer: track.composer || track.director || directorName,
      isFullSong: track.isPreview ? false : (track.isFullSong !== false),
      isPreview: Boolean(track.isPreview),
    };
    const prev = bestByKey.get(key);
    if (!prev || trackQualityScore(normalized) > trackQualityScore(prev)) {
      bestByKey.set(key, normalized);
    }
  };

  // 1. Curated local tracks
  const localDirectorTracks = filterTracks({ director: cleanName }) || [];
  localDirectorTracks.forEach((t) => pushTrack(t));

  // 1b. Express MySQL catalog (/api/songs?director=)
  try {
    const params = new URLSearchParams({
      director: cleanName,
      limit: String(Math.min(maxTracks, 300)),
    });
    const dRes = await apiFetch(`songs?${params.toString()}`);
    if (dRes.ok) {
      const dData = await dRes.json();
      const dSongs = dData?.songs || dData?.results || [];
      for (const s of dSongs) {
        pushTrack({
          ...s,
          id: s.id,
          title: s.title,
          artist: s.artist,
          audioUrl: s.audioUrl || s.audio_url,
          coverUrl: s.coverUrl || s.cover_url,
          durationSec: s.durationSec || s.duration_sec || 210,
          director: s.director || s.director_name || directorName,
          isFullSong: true,
          isPreview: Boolean(s.isPreview),
        });
      }
    }
  } catch (e) {
    console.warn('Express director songs fetch notice:', e.message);
  }

  // 2. JioSaavn multi-query (chunked so one failure does not wipe the catalog)
  try {
    const queries = buildDirectorQueries(cleanName, effectiveLang);
    const saavnTracks = await runDirectorQueriesInChunks(queries, 80);
    for (const track of saavnTracks) {
      pushTrack({
        ...track,
        director: directorName,
        isFullSong: Boolean(track.audioUrl) && !track.isPreview,
        isPreview: Boolean(track.isPreview),
      });
    }
  } catch (e) {
    console.warn('Director Saavn fetch note:', e.message);
  }

  // 3. If still thin, pull multi-source search (iTunes / FreeToUse / curated)
  if (bestByKey.size < 40) {
    try {
      const extras = await searchSongsFromApi(`${cleanName} ${effectiveLang} songs`, 60, effectiveLang);
      for (const track of extras || []) {
        pushTrack(track);
      }
    } catch (e) {
      console.warn('Director multi-source fallback notice:', e.message);
    }
  }

  // Prefer full playable songs first, then previews (already unique by title)
  const aggregatedTracks = dedupeTracksBySong([...bestByKey.values()]);
  aggregatedTracks.sort((a, b) => {
    const aFull = a.audioUrl && !a.isPreview ? 1 : 0;
    const bFull = b.audioUrl && !b.isPreview ? 1 : 0;
    if (bFull !== aFull) return bFull - aFull;
    return 0;
  });

  return aggregatedTracks.slice(0, maxTracks);
}

/**
 * Fetch song catalog for a film actor (same unique-title rules as directors).
 */
export async function fetchActorHitsFromApi(actorName, limit = 500, language = 'all', searchQuery = '') {
  if (!actorName) return [];

  const cleanName = String(actorName).trim();
  const effectiveLang = (language && language !== 'all' ? language : 'tamil').toLowerCase();
  const maxTracks = Math.max(50, Number(limit) || 500);
  const baseQuery = (searchQuery || `${cleanName} songs`).trim();

  const queries = [
    baseQuery,
    `${cleanName} hit songs`,
    `${cleanName} movie songs`,
    `${cleanName} ${effectiveLang} songs`,
    `${cleanName} mass songs`,
    `${cleanName} melody songs`,
  ];

  const bestByKey = new Map();
  const pushTrack = (track) => {
    if (!track) return;
    const key = uniqueSongKey(track);
    if (!key) return;
    const normalized = {
      ...track,
      isFullSong: track.isPreview ? false : (track.isFullSong !== false),
      isPreview: Boolean(track.isPreview),
    };
    const prev = bestByKey.get(key);
    if (!prev || trackQualityScore(normalized) > trackQualityScore(prev)) {
      bestByKey.set(key, normalized);
    }
  };

  // Local curated matches (artist / album / title mention)
  const localHits = (filterTracks({ searchQuery: cleanName }) || []).filter((t) => {
    const hay = `${t.title || ''} ${t.artist || ''} ${t.album || ''} ${t.film || ''}`.toLowerCase();
    return hay.includes(cleanName.toLowerCase().split(' ')[0]);
  });
  localHits.forEach(pushTrack);

  try {
    const chunkSize = 3;
    for (let i = 0; i < queries.length; i += chunkSize) {
      const chunk = queries.slice(i, i + chunkSize);
      const settled = await Promise.allSettled(
        chunk.map((q) => searchFromJioSaavn(q, 80, 'all'))
      );
      for (const result of settled) {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          result.value.forEach(pushTrack);
        }
      }
    }
  } catch (e) {
    console.warn('Actor Saavn fetch note:', e.message);
  }

  if (bestByKey.size < 30) {
    try {
      const extras = await searchSongsFromApi(baseQuery, 80, effectiveLang);
      (extras || []).forEach(pushTrack);
    } catch (e) {
      console.warn('Actor multi-source fallback notice:', e.message);
    }
  }

  const aggregatedTracks = dedupeTracksBySong([...bestByKey.values()]);
  aggregatedTracks.sort((a, b) => {
    const aFull = a.audioUrl && !a.isPreview ? 1 : 0;
    const bFull = b.audioUrl && !b.isPreview ? 1 : 0;
    return bFull - aFull;
  });

  return aggregatedTracks.slice(0, maxTracks);
}

/**
 * Search specifically for BGM/Instrumental tracks via JioSaavn / iTunes failover
 */
export async function searchBGM(query = '', language = 'all', limit = 30) {
  const bgmQuery = query
    ? `${query} bgm theme background score`
    : `${language !== 'all' ? language : 'indian'} bgm theme background score`;

  const apiResults = await searchSongsFromApi(bgmQuery, limit);
  if (apiResults.length > 0) {
    return apiResults.map(t => ({ ...t, category: 'bgm' }));
  }

  return filterTracks({ language, category: 'bgm', searchQuery: query }).slice(0, limit);
}

// ─── Helper Functions ────────────────────────────────────────────

function cleanHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function inferLanguage(query = '') {
  const q = query.toLowerCase();
  if (q.includes('tamil')) return 'tamil';
  if (q.includes('malayalam') || q.includes('mallu')) return 'malayalam';
  if (q.includes('telugu') || q.includes('tollywood')) return 'telugu';
  if (q.includes('kannada') || q.includes('sandalwood')) return 'kannada';
  if (q.includes('hindi') || q.includes('bollywood')) return 'hindi';
  if (q.includes('english') || q.includes('pop') || q.includes('rock')) return 'english';
  return 'hindi';
}

function extractDirectorName(artistName = "", collectionName = "", searchInput = "") {
  const text = `${artistName} ${collectionName} ${searchInput}`.toLowerCase();

  if (text.includes("rahman")) return "A.R. Rahman";
  if (text.includes("anirudh")) return "Anirudh Ravichander";
  if (text.includes("harris")) return "Harris Jayaraj";
  if (text.includes("ilaiyaraaja") || text.includes("ilayaraja")) return "Ilaiyaraaja";
  if (text.includes("yuvan")) return "Yuvan Shankar Raja";
  if (text.includes("g.v. prakash") || text.includes("gv prakash")) return "G.V. Prakash Kumar";
  if (text.includes("santhosh narayanan") || text.includes("sana")) return "Santhosh Narayanan";
  if (text.includes("hip hop") || text.includes("hiphop tamizha")) return "Hiphop Tamizha";
  if (text.includes("d. imman") || text.includes("imman")) return "D. Imman";
  if (text.includes("vidyasagar")) return "Vidyasagar";
  if (text.includes("deva")) return "Deva";
  if (text.includes("sean roldan")) return "Sean Roldan";
  if (text.includes("ghibran")) return "Ghibran";

  if (text.includes("ajay") && text.includes("atul")) return "Ajay-Atul";
  if (text.includes("praak")) return "B Praak";
  if (text.includes("jaani")) return "Jaani";
  if (text.includes("jeet gannguli") || text.includes("ganguly")) return "Jeet Gannguli";
  if (text.includes("anupam roy")) return "Anupam Roy";

  if (text.includes("sushin")) return "Sushin Shyam";
  if (text.includes("jayachandran")) return "M. Jayachandran";
  if (text.includes("gopi sundar")) return "Gopi Sundar";
  if (text.includes("ouseppachan")) return "Ouseppachan";
  if (text.includes("radhakrishnan")) return "M.G. Radhakrishnan";
  if (text.includes("bijibal")) return "Bijibal";

  if (text.includes("keeravani")) return "M.M. Keeravani";
  if (text.includes("devi sri") || text.includes("dsp")) return "Devi Sri Prasad (DSP)";
  if (text.includes("thaman")) return "S.S. Thaman";
  if (text.includes("mickey")) return "Mickey J Meyer";
  if (text.includes("mani sharma")) return "Mani Sharma";
  if (text.includes("anup rubens")) return "Anup Rubens";

  if (text.includes("harikrishna")) return "V. Harikrishna";
  if (text.includes("ravi basrur")) return "Ravi Basrur";
  if (text.includes("arjun janya")) return "Arjun Janya";
  if (text.includes("gurukiran")) return "Gurukiran";
  if (text.includes("hamsalekha")) return "Hamsalekha";
  if (text.includes("ajaneesh") || text.includes("loknath")) return "B. Ajaneesh Loknath";

  if (text.includes("pritam")) return "Pritam";
  if (text.includes("arijit")) return "Arijit Singh / Mithoon";
  if (text.includes("vishal") && text.includes("shekhar")) return "Vishal-Shekhar";
  if (text.includes("shankar") && text.includes("ehsaan")) return "Shankar-Ehsaan-Loy";
  if (text.includes("amit trivedi")) return "Amit Trivedi";
  if (text.includes("r.d. burman") || text.includes("pancham")) return "R.D. Burman";
  if (text.includes("laxmikant") || text.includes("pyarelal")) return "Laxmikant-Pyarelal";
  if (text.includes("sachin") && text.includes("jigar")) return "Sachin-Jigar";

  if (text.includes("ed sheeran")) return "Ed Sheeran";
  if (text.includes("taylor swift")) return "Taylor Swift";
  if (text.includes("weeknd")) return "The Weeknd";
  if (text.includes("billie eilish")) return "Billie Eilish";
  if (text.includes("coldplay")) return "Coldplay";
  if (text.includes("adele")) return "Adele";
  if (text.includes("hans zimmer")) return "Hans Zimmer";

  return artistName?.split(',')[0] || "Music Director";
}

function getRandomColor(index) {
  const colors = ["#FF6B00", "#e11d48", "#3b82f6", "#8b5cf6", "#d97706", "#10b981", "#ec4899", "#6366f1", "#ef4444", "#14b8a6"];
  return colors[index % colors.length];
}

function getDefaultCover(index) {
  const covers = [
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80"
  ];
  return covers[index % covers.length];
}
