import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { COOKIE_CONSENT_STORAGE_KEY, hasAnalyticsConsent, saveCookieConsent } from '../../src/scripts/cookies/consent';
import { READER_ID_KEY, createReaderTracker, readerEventPayload, readerId } from '../../src/scripts/analytics/readerEvents';
import { northStarLine } from '../../src/scripts/analytics/northStar';

const storage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    values,
  };
};
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const off = saveCookieConsent({ analytics: false, advertising: true });
const on = saveCookieConsent({ analytics: true, advertising: false });

describe('anonymous reader id', () => {
  it('treats usage statistics as on until the reader turns them off', () => {
    expect(hasAnalyticsConsent(null)).toBe(true);
    expect(hasAnalyticsConsent(on)).toBe(true);
    expect(hasAnalyticsConsent(off)).toBe(false);
  });

  it('creates one random id and reuses it on later visits', () => {
    const store = storage();
    const make = vi.fn(() => ID);
    expect(readerId(store, make)).toBe(ID);
    expect(readerId(store, make)).toBe(ID);
    expect(make).toHaveBeenCalledTimes(1);
    expect(store.values.get(READER_ID_KEY)).toBe(ID);
  });

  it('gives no id, and removes a stored one, when statistics are turned off', () => {
    const store = storage({ [READER_ID_KEY]: ID, [COOKIE_CONSENT_STORAGE_KEY]: off });
    expect(readerId(store, () => 'never')).toBeNull();
    expect(store.values.has(READER_ID_KEY)).toBe(false);
  });

  it('replaces a stored value that is not a valid id', () => {
    const store = storage({ [READER_ID_KEY]: '<script>' });
    expect(readerId(store, () => ID)).toBe(ID);
  });

  it('works without browser storage by sending nothing', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => {}, removeItem: () => {} };
    expect(readerId(broken, () => ID)).toBeNull();
  });
});

describe('reader event tracker', () => {
  it('sends the id, the event and a bounded target, once per event and target on a page', () => {
    const send = vi.fn();
    const track = createReaderTracker({ storage: storage(), send, makeId: () => ID });
    track('research_open', '2330');
    track('research_open', '2330');
    track('research_open', '2454');
    track('claims_open', 'x'.repeat(200));
    expect(send.mock.calls.map(([payload]) => payload)).toEqual([
      { visitor: ID, event: 'research_open', target: '2330' },
      { visitor: ID, event: 'research_open', target: '2454' },
      { visitor: ID, event: 'claims_open', target: 'x'.repeat(80) },
    ]);
  });

  it('sends nothing when statistics are off, and never throws into the page', () => {
    const send = vi.fn();
    createReaderTracker({ storage: storage({ [COOKIE_CONSENT_STORAGE_KEY]: off }), send, makeId: () => ID })('research_open', '2330');
    expect(send).not.toHaveBeenCalled();
    const failing = createReaderTracker({ storage: storage(), send: () => { throw new Error('offline'); }, makeId: () => ID });
    expect(() => failing('hero_search')).not.toThrow();
  });
});

describe('server-side validation of a posted reader event', () => {
  it('accepts only a well-formed id, a known event and a short target', () => {
    expect(readerEventPayload({ visitor: ID, event: 'analysis_open', target: '6857-JP' })).toEqual({ visitor: ID, event: 'analysis_open', target: '6857-JP' });
    expect(readerEventPayload({ visitor: ID, event: 'hero_search' })).toEqual({ visitor: ID, event: 'hero_search', target: '' });
    for (const bad of [null, 'text', { visitor: 'short', event: 'hero_search' }, { visitor: ID, event: 'page_view' },
      { visitor: ID, event: 'hero_search', target: 'x'.repeat(81) }, { visitor: ID, event: 'hero_search', target: 5 }]) {
      expect(readerEventPayload(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it('forwards events with the internal secret and never exposes the owner-only numbers publicly', () => {
    const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
    const track = read('src/pages/api/market/track.ts');
    expect(track).toContain('/market/internal/reader-events');
    expect(track).toContain("'X-Internal-Secret'");
    expect(track).toContain('process.env.MARKET_INTERNAL_SECRET');
    expect(track).not.toMatch(/x-forwarded-for|user-agent|clientAddress/i); // no IP or browser details are passed on
    const northStar = read('src/pages/api/market/north-star.ts');
    expect(northStar).toContain('/market/admin/north-star');
    expect(northStar).toContain("request.headers.get('authorization')");
    expect(northStar).not.toContain('X-Internal-Secret');
  });
});

describe('owner readout of the north star', () => {
  const weeks = [
    { weekStart: '2026-11-09', weekEnd: '2026-11-15', activeReaders: 1234, returningReaders: 56, events: {} },
    { weekStart: '2026-11-02', weekEnd: '2026-11-08', activeReaders: 40, returningReaders: 9, events: {} },
  ];
  it('states this week and last week with formatted counts', () => {
    expect(northStarLine(weeks, 'zh')).toBe('本週回訪研究讀者 56 人（活躍 1,234 人）· 上週 9 人（活躍 40 人）');
    expect(northStarLine(weeks, 'en')).toBe('Returning research readers this week: 56 (1,234 active) · last week: 9 (40 active)');
  });
  it('says so when there is nothing yet', () => {
    expect(northStarLine([], 'zh')).toBe('尚無讀者資料');
    expect(northStarLine(weeks.slice(0, 1), 'zh')).toBe('本週回訪研究讀者 56 人（活躍 1,234 人）');
  });
});

describe('where reading is counted', () => {
  const script = readFileSync(resolve(process.cwd(), 'src/scripts/index.ts'), 'utf8');
  it('counts opening research or AI analysis, expanding report claims, hero searches and topic picks', () => {
    expect(script).toMatch(/tabName === 'ai-analysis'\)[^\n]*trackReaderEvent\('analysis_open'/);
    expect(script).toMatch(/tabName === 'research'\)[^\n]*trackReaderEvent\('research_open'/);
    expect(script).toContain("trackReaderEvent('claims_open'");
    expect(script).toContain("initHeroSearch(document, trackReaderEvent)");
  });
});
