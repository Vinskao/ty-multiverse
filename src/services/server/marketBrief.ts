// Server-only: fetches Maya Sawa's public chip summary for SSR and the agent-facing routes.
// Always asks the backend first (it rebuilds as soon as the holdings/custom list changes and is cached
// there otherwise); the local copy is only a fallback so a slow or down backend never stalls the page.
const MAYA_SAWA_URL = process.env.MAYA_SAWA_INTERNAL_URL || import.meta.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa';
const TIMEOUT_MS = 2_500;

const lastGood = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

async function fetchBrief(format: 'json' | 'md') {
  const response = await fetch(`${MAYA_SAWA_URL}/market/dashboard/brief?format=${format}`, {
    headers: { Accept: format === 'md' ? 'text/markdown' : 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS * 4),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const value = format === 'md' ? await response.text() : await response.json();
  lastGood.set(format, value);
  return value;
}

export async function getMarketBrief<T = any>(format: 'json' | 'md' = 'json'): Promise<T | null> {
  if (!inflight.has(format)) inflight.set(format, fetchBrief(format).finally(() => inflight.delete(format)));
  const request = inflight.get(format)!;
  try {
    const value = await Promise.race([request, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), TIMEOUT_MS))]);
    if (value !== undefined) return value as T;
  } catch (error) {
    console.error('Market brief unavailable:', error);
  }
  request.catch(() => undefined); // a late failure after the timeout is already handled by the fallback
  return (lastGood.get(format) as T | undefined) ?? null;
}
