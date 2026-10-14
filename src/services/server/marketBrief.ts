// Server-only: fetches Maya Sawa's public chip summary for SSR and the agent-facing routes.
// Stale-while-revalidate so rendering the home page never waits on the backend once warm.
const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';
const FRESH_MS = 60_000;
const TIMEOUT_MS = 2_500;

type Cached<T> = { value: T; fetchedAt: number };
const cache = new Map<string, Cached<any>>();
const inflight = new Map<string, Promise<any>>();

async function fetchBrief(format: 'json' | 'md') {
  const response = await fetch(`${MAYA_SAWA_URL}/market/dashboard/brief?format=${format}`, {
    headers: { Accept: format === 'md' ? 'text/markdown' : 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS * 4),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return format === 'md' ? response.text() : response.json();
}

function refresh(format: 'json' | 'md') {
  if (!inflight.has(format)) {
    inflight.set(format, fetchBrief(format)
      .then((value) => { cache.set(format, { value, fetchedAt: Date.now() }); return value; })
      .finally(() => inflight.delete(format)));
  }
  return inflight.get(format)!;
}

/** Returns the cached brief immediately (refreshing in the background when stale), or waits briefly on a cold cache. */
export async function getMarketBrief<T = any>(format: 'json' | 'md' = 'json'): Promise<T | null> {
  const cached = cache.get(format);
  if (cached) {
    if (Date.now() - cached.fetchedAt > FRESH_MS) refresh(format).catch((error) => console.error('Market brief refresh failed:', error));
    return cached.value;
  }
  try {
    return await Promise.race([refresh(format), new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS))]);
  } catch (error) {
    console.error('Market brief unavailable:', error);
    return null;
  }
}
