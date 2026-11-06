import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('cookie consent visibility', () => {
  it('explicitly hides menu and banner when marked hidden', () => {
    const css = readFileSync('src/styles/cookieConsent.css', 'utf8');
    expect(css).toMatch(/\.cookie-consent\s+\[hidden\]\s*\{\s*display:\s*none\s*!important\s*;/);
  });
});
