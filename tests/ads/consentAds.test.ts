import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { mountPublisherAds, unmountPublisherAds } from '../../src/scripts/ads/consentAds';

describe('publisher ad consent gate', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="monetag-ipp" data-monetag-zone="12196776"></div>'; });

  it('does not request third-party ads without advertising consent', async () => {
    await mountPublisherAds(document, false);
    expect(document.querySelectorAll('script[src*="nap5k.com"]')).toHaveLength(0);
  });

  it('loads Monetag after consent and removes it when consent is withdrawn', async () => {
    const pending = mountPublisherAds(document, true);
    document.querySelector<HTMLScriptElement>('script[src]')!.dispatchEvent(new Event('load'));
    await pending;
    expect(document.querySelector<HTMLScriptElement>('script[src]')!.src).toBe('https://nap5k.com/tag.min.js');
    unmountPublisherAds(document);
    expect(document.querySelectorAll('script[src*="nap5k.com"]')).toHaveLength(0);
  });
});

// 2026-11-14: every Adsterra tag was removed; its ad host was bauval.org.
it('has no Adsterra code left in the site', () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
  for (const file of [...walk('src'), ...walk('public')].filter(f => /\.(astro|ts|js|html|txt)$/.test(f))) {
    expect(readFileSync(file, 'utf8'), file).not.toMatch(/adsterra|bauval\.org/i);
  }
});
