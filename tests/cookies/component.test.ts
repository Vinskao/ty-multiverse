import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('site cookie settings entry points', () => {
  const nav = read('src/components/Nav.astro');
  const consent = read('src/components/CookieConsent.astro');
  it('places the settings gear immediately after the notification bell', () => {
    expect(nav.indexOf('<NotificationCenter />')).toBeGreaterThan(-1);
    expect(nav.indexOf('<CookieConsent />')).toBeGreaterThan(nav.indexOf('<NotificationCenter />'));
    expect(consent).toContain('data-cookie-gear');
  });

  it('offers editable cookie preferences and a privacy explanation', () => {
    expect(consent).toContain('變更 Cookie 設定');
    expect(consent).toContain('隱私權說明');
    expect(consent).toContain('href="/privacy/"');
    expect(read('src/pages/privacy.astro')).toContain('Monetag 隱私權政策');
  });
});
