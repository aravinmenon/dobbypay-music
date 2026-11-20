/**
 * Safe iTunes API Client
 * - Localhost CORS bypass via Vite proxy (/itunes-api)
 * - In-memory query caching
 * - 429 Too Many Requests backoff / circuit-breaker
 * - Safe error handling (no unhandled rejections or console spam)
 */

const itunesCache = new Map();
let rateLimitedUntil = 0;

function isLocalhost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

export function getItunesSearchBaseUrl() {
  // Use Vite proxy when on localhost to bypass CORS & rate limiting headers
  if (isLocalhost()) {
    return '/itunes-api/search';
  }
  return 'https://itunes.apple.com/search';
}

/**
 * Searches iTunes songs safely with caching and rate-limit circuit breaking.
 * @param {string} term 
 * @param {number} limit 
 * @returns {Promise<Array>} results list (empty array on error/429)
 */
export async function searchItunesSafe(term, limit = 3) {
  if (!term || typeof term !== 'string' || !term.trim()) {
    return [];
  }

  const cleanTerm = term.trim();
  const cacheKey = `${cleanTerm.toLowerCase()}_${limit}`;

  if (itunesCache.has(cacheKey)) {
    return itunesCache.get(cacheKey);
  }

  // Circuit breaker: If we recently hit a 429 rate limit, skip to prevent spamming
  const now = Date.now();
  if (now < rateLimitedUntil) {
    return [];
  }

  try {
    const baseUrl = getItunesSearchBaseUrl();
    const url = `${baseUrl}?term=${encodeURIComponent(cleanTerm)}&media=music&entity=song&limit=${limit}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    clearTimeout(timeoutId);

    if (res.status === 429) {
      // Apple rate limited us; back off for 45 seconds
      rateLimitedUntil = Date.now() + 45000;
      console.warn('[iTunes] Rate limited (429). Backing off iTunes queries for 45s.');
      return [];
    }

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];

    // Cache results (max 100 entries)
    if (itunesCache.size > 100) {
      const firstKey = itunesCache.keys().next().value;
      itunesCache.delete(firstKey);
    }
    itunesCache.set(cacheKey, results);

    return results;
  } catch (_) {
    // Network error, aborted, or CORS fallback failure
    return [];
  }
}
