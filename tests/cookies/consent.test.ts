import { describe, expect, it } from 'vitest';
import { hasAdvertisingConsent, readCookieConsent, saveCookieConsent, type CookieConsent } from '../../src/scripts/cookies/consent';

describe('cookie consent preferences', () => {
  it('keeps advertising on until a visitor saves an off preference', () => {
    expect(readCookieConsent(null)).toBeNull();
    expect(hasAdvertisingConsent(null)).toBe(true);
    expect(hasAdvertisingConsent(saveCookieConsent({ analytics: false, advertising: false }))).toBe(false);
  });

  it('persists explicit optional choices with a version and timestamp', () => {
    const values: CookieConsent = { analytics: true, advertising: false };
    const saved = saveCookieConsent(values, '2026-11-05T10:00:00.000Z');
    expect(readCookieConsent(saved)).toEqual({
      version: 1,
      necessary: true,
      analytics: true,
      advertising: false,
      updatedAt: '2026-11-05T10:00:00.000Z',
    });
  });

  it('rejects malformed or obsolete data instead of enabling optional cookies', () => {
    expect(readCookieConsent('{bad json')).toBeNull();
    expect(readCookieConsent(JSON.stringify({ version: 0, necessary: false, analytics: true, advertising: true }))).toBeNull();
    expect(readCookieConsent(JSON.stringify({ version: 1, necessary: false, analytics: true, advertising: true }))).toBeNull();
  });
});
