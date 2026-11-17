// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';

// 2026-11-17: the server is slow, so a language switch that refetches data must show the page spinner until it is done;
// before, the toggle looked dead for seconds.
const script = readFileSync('public/scripts/lang.js', 'utf8');
type Api = { set: (code: string) => void; busy: <T>(work: Promise<T>) => Promise<T> };
const api = () => (window as unknown as { AppLang: Api }).AppLang;
const spinning = () => document.documentElement.classList.contains('page-loading');

describe('AppLang.busy', () => {
  beforeEach(() => {
    delete (window as unknown as { AppLang?: Api }).AppLang;
    document.documentElement.className = '';
    window.eval(script);
  });

  it('shows the page spinner while the work runs and hides it afterwards', async () => {
    let finish: () => void = () => {};
    const work = api().busy(new Promise<void>((resolve) => { finish = resolve; }));
    expect(spinning()).toBe(true);
    finish();
    await work;
    expect(spinning()).toBe(false);
  });

  it('keeps spinning until every overlapping job is done, even when one fails', async () => {
    let finishSlow: () => void = () => {};
    const slow = api().busy(new Promise<void>((resolve) => { finishSlow = resolve; }));
    await api().busy(Promise.reject(new Error('boom'))).catch(() => undefined);
    expect(spinning()).toBe(true);
    finishSlow();
    await slow;
    expect(spinning()).toBe(false);
  });

  it('returns what the work returned', async () => {
    await expect(api().busy(Promise.resolve(7))).resolves.toBe(7);
  });
});

// 2026-11-17: /?lang=zh renders Chinese on the server, but AppLang read only localStorage (which said "en"), so the
// toggle showed 繁 while AppLang was "en"; the first click only made the state match the page and nothing changed.
describe('AppLang and the ?lang= parameter', () => {
  // tests/setup.ts stubs localStorage and location with inert objects, so each test installs working ones.
  const load = (search: string, stored?: string) => {
    delete (window as unknown as { AppLang?: unknown }).AppLang;
    const store = new Map<string, string>(stored ? [['site_language', stored]] : []);
    Object.defineProperty(window, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); }, clear: () => store.clear() } });
    const place = { href: `http://localhost:4321/${search}`, pathname: '/', search, hash: '' };
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: place });
    window.history.replaceState = ((_: unknown, __: string, url: string) => {
      const next = new URL(url, 'http://localhost:4321');
      place.search = next.search; place.href = next.href;
    }) as History['replaceState'];
    window.eval(script);
    return (window as unknown as { AppLang: { get: () => string; set: (code: string) => void } }).AppLang;
  };

  it('an explicit ?lang= wins over the stored language and is remembered', () => {
    const lang = load('?lang=zh', 'en');
    expect(lang.get()).toBe('zh');
    expect(window.localStorage.getItem('site_language')).toBe('zh');
  });

  it('ignores an unknown ?lang= value', () => {
    expect(load('?lang=fr', 'zh').get()).toBe('zh');
  });

  it('switching language keeps the ?lang= parameter in step so a reload does not undo it', () => {
    const lang = load('?lang=zh', 'en');
    lang.set('en');
    expect(window.location.search).toBe('?lang=en');
    expect(lang.get()).toBe('en');
  });

  it('leaves a URL without ?lang= alone', () => {
    const lang = load('', 'en');
    lang.set('zh');
    expect(window.location.search).toBe('');
  });
});
