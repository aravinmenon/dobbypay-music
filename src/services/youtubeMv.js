const PIPED_API_BASES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.nosebs.ru',
];

const cache = new Map();

function extractVideoId(item) {
  if (!item || typeof item !== 'object') return '';
  const raw =
    item.url ||
    item.id ||
    item.videoId ||
    item.videoID ||
    '';
  const text = String(raw);
  const m = text.match(/(?:v=|\/watch\?v=|youtu\.be\/|\/shorts\/|\/embed\/)?([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;
  return '';
}

async function searchPiped(base, query) {
  const url = `${base}/search?q=${encodeURIComponent(query)}&filter=videos`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const items = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
        ? data
        : [];
    for (const item of items) {
      const type = String(item.type || item.uploaderType || '').toLowerCase();
      if (type && type !== 'stream' && type !== 'video') continue;
      const id = extractVideoId(item);
      if (id) {
        return {
          videoId: id,
          title: item.title || '',
          embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
          watchUrl: `https://www.youtube.com/watch?v=${id}`,
        };
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export function buildMvSearchQuery(track) {
  if (!track) return '';
  const title = String(track.title || '').trim();
  const artist = String(track.artist || track.singers || track.director || '').trim();
  if (!title) return '';
  return [title, artist, 'official video'].filter(Boolean).join(' ');
}

export function getYoutubeSearchPageUrl(track) {
  const q = buildMvSearchQuery(track);
  return q ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` : '';
}

/** Find a YouTube music video for this track (cached). Returns null if none. */
export async function findYoutubeMusicVideo(track) {
  const query = buildMvSearchQuery(track);
  if (!query) return null;
  const cacheKey = query.toLowerCase();
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  for (const base of PIPED_API_BASES) {
    const hit = await searchPiped(base, query);
    if (hit) {
      cache.set(cacheKey, hit);
      return hit;
    }
  }

  cache.set(cacheKey, null);
  return null;
}
