import { filterTracks } from '../data/indianMusicData.js';
import { dedupeTracksBySong } from './musicApi.js';

/** True when a track belongs to this music director, including recent plays. */
export function trackMatchesDirector(track, directorQuery) {
  const query = String(directorQuery || '').toLowerCase();
  const blob = [track?.director, track?.artist, track?.album, track?.composer]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (!blob || !query) return false;
  if (query.includes('rahman')) return blob.includes('rahman');
  if (query.includes('yuvan')) return blob.includes('yuvan');
  if (query.includes('anirudh')) return blob.includes('anirudh');
  const cleaned = query.replace(/\(.*?\)/g, '').trim();
  return cleaned.length > 2 && blob.includes(cleaned);
}

/**
 * Queue for a home mix: the user's recent plays by this director first,
 * then the rest of that director's catalog.
 */
export function buildDailyMixQueue(directorQuery, recentTracks = []) {
  const catalog = filterTracks({ director: directorQuery });
  const recent = (Array.isArray(recentTracks) ? recentTracks : []).filter((track) =>
    trackMatchesDirector(track, directorQuery)
  );
  return dedupeTracksBySong([...recent, ...catalog]);
}
