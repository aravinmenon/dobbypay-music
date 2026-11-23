/**
 * Persist last played track + position so reopen resumes where the user stopped.
 */

const STORAGE_KEY = 'dobbypay_playback_session';

const TRACK_FIELDS = [
  'id',
  'rawId',
  'title',
  'artist',
  'director',
  'album',
  'duration',
  'durationSec',
  'audioUrl',
  'coverUrl',
  'image',
  'albumArt',
  'language',
  'isPreview',
  'isFullSong',
  'provider',
  'quality',
  'color',
];

function slimTrack(track) {
  if (!track || typeof track !== 'object') return null;
  const out = {};
  for (const key of TRACK_FIELDS) {
    if (track[key] !== undefined && track[key] !== null) out[key] = track[key];
  }
  if (!out.id && !out.title) return null;
  if (!out.audioUrl && !out.id) return null;
  return out;
}

function slimQueue(queue, max = 80) {
  if (!Array.isArray(queue) || queue.length === 0) return [];
  return queue.slice(0, max).map(slimTrack).filter(Boolean);
}

export function savePlaybackSession({
  track,
  queue = [],
  queueIndex = 0,
  position = 0,
  wasPlaying = false,
} = {}) {
  if (typeof window === 'undefined') return false;
  const slim = slimTrack(track);
  if (!slim) return false;
  const pos = Number(position);
  const safePos = Number.isFinite(pos) && pos > 0 ? pos : 0;
  const payload = {
    track: slim,
    queue: slimQueue(queue),
    queueIndex: Math.max(0, Number(queueIndex) || 0),
    position: safePos,
    wasPlaying: Boolean(wasPlaying),
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[playbackSession] save failed:', err?.message || err);
    return false;
  }
}

export function loadPlaybackSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.track || typeof data.track !== 'object') return null;
    return {
      track: data.track,
      queue: Array.isArray(data.queue) ? data.queue : [],
      queueIndex: Math.max(0, Number(data.queueIndex) || 0),
      position: Math.max(0, Number(data.position) || 0),
      wasPlaying: Boolean(data.wasPlaying),
      savedAt: data.savedAt || 0,
    };
  } catch (_) {
    return null;
  }
}

export function clearPlaybackSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}
