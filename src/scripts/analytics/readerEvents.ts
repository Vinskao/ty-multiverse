// Anonymous reader events for the north star metric (docs/NORTH_STAR.md): which research was opened, by a random id
// that lives only in this browser. Nothing is sent when the reader turns statistics off in Cookie settings.
import { COOKIE_CONSENT_STORAGE_KEY, READER_ID_KEY, hasAnalyticsConsent } from '../cookies/consent';

export { READER_ID_KEY };
export const READER_EVENTS = ['research_open', 'analysis_open', 'claims_open', 'hero_search', 'topic_pick'] as const;
export type ReaderEvent = typeof READER_EVENTS[number];
export type ReaderEventPayload = { visitor: string; event: ReaderEvent; target: string };

const ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const TARGET_LIMIT = 80;
type IdStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** The reader's random id, created on first use; null (and the stored id removed) when statistics are off. */
export function readerId(storage: IdStorage, makeId: () => string = () => crypto.randomUUID()): string | null {
  try {
    if (!hasAnalyticsConsent(storage.getItem(COOKIE_CONSENT_STORAGE_KEY))) {
      storage.removeItem(READER_ID_KEY);
      return null;
    }
    const saved = storage.getItem(READER_ID_KEY);
    if (saved && ID_PATTERN.test(saved)) return saved;
    const created = makeId();
    if (!ID_PATTERN.test(created)) return null;
    storage.setItem(READER_ID_KEY, created);
    return created;
  } catch {
    return null; // storage blocked: count nothing rather than break the page
  }
}

/** Server-side check of a posted body; mirrors the limits in maya-sawa's reader_events_db. */
export function readerEventPayload(body: unknown): ReaderEventPayload | null {
  if (!body || typeof body !== 'object') return null;
  const { visitor, event, target = '' } = body as Record<string, unknown>;
  if (typeof visitor !== 'string' || !ID_PATTERN.test(visitor)) return null;
  if (typeof event !== 'string' || !(READER_EVENTS as readonly string[]).includes(event)) return null;
  if (typeof target !== 'string' || target.length > TARGET_LIMIT) return null;
  return { visitor, event: event as ReaderEvent, target };
}

type TrackerOptions = { storage: IdStorage; send: (payload: ReaderEventPayload) => void; makeId?: () => string };

/** One event per (event, target) per page load, so re-opening a tab does not inflate the counts. */
export function createReaderTracker({ storage, send, makeId }: TrackerOptions) {
  const sent = new Set<string>();
  return (event: ReaderEvent, target = ''): void => {
    try {
      const bounded = String(target ?? '').slice(0, TARGET_LIMIT);
      const key = `${event}|${bounded}`;
      if (sent.has(key)) return;
      const visitor = readerId(storage, makeId);
      if (!visitor) return;
      sent.add(key);
      send({ visitor, event, target: bounded });
    } catch { /* measuring must never break reading */ }
  };
}

let browserTracker: ((event: ReaderEvent, target?: string) => void) | null = null;

export function trackReaderEvent(event: ReaderEvent, target = ''): void {
  if (typeof window === 'undefined') return;
  browserTracker ??= createReaderTracker({
    storage: window.localStorage,
    send: (payload) => {
      void fetch(`${import.meta.env.BASE_URL}api/market/track`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true,
      }).catch(() => undefined);
    },
  });
  browserTracker(event, target);
}
