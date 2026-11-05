import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountPublisherAds, unmountPublisherAds } from '../../src/scripts/ads/consentAds';

describe('publisher ad consent gate', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="adsterra-300x250" data-adsterra="300x250"></div><div id="adsterra-responsive-banner" data-adsterra="responsive"></div><div id="adsterra-native" data-adsterra="native"><div id="container-native"></div></div><div id="monetag-ipp" data-monetag-zone="12196776"></div>';
  });

  it('does not request third-party ads without advertising consent', async () => {
    await mountPublisherAds(document, false);
    expect(document.querySelectorAll('script[src*="bauval.org"], script[src*="nap5k.com"]')).toHaveLength(0);
  });

  it('loads each configured provider unit only after advertising consent', async () => {
    document.body.innerHTML = '<div id="adsterra-300x250" data-adsterra="300x250"></div>';
    const pending = mountPublisherAds(document, true, 1280);
    await vi.waitFor(() => expect(document.querySelectorAll('script[src]')).toHaveLength(1));
    document.querySelector<HTMLScriptElement>('script[src]')!.dispatchEvent(new Event('load'));
    await pending;
    const urls = [...document.querySelectorAll<HTMLScriptElement>('script[src]')].map(script => script.src);
    expect(urls).toContain('https://bauval.org/22/2143d97a1a273993069cffe00f798381');
    expect(urls).toEqual(['https://bauval.org/22/2143d97a1a273993069cffe00f798381']);
    unmountPublisherAds(document);
    expect(document.querySelectorAll('script[src*="bauval.org"], script[src*="nap5k.com"]')).toHaveLength(0);
  });

  it('stops pending provider requests when advertising is turned off', async () => {
    document.body.innerHTML = '<div data-adsterra="300x250"></div><div data-adsterra="responsive"></div>';
    const pending = mountPublisherAds(document, true, 1280);
    await vi.waitFor(() => expect(document.querySelectorAll('script[src]')).toHaveLength(1));
    await mountPublisherAds(document, false, 1280);
    await pending;
    expect(document.querySelectorAll('script[src*="bauval.org"], script[src*="nap5k.com"]')).toHaveLength(0);
    expect(document.querySelectorAll('[data-adsterra][data-loaded="true"]')).toHaveLength(0);
  });
});
