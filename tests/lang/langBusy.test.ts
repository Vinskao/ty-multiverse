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
