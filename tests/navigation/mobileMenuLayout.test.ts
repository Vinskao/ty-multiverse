import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('mobile navigation layout', () => {
  const navCss = readFileSync('src/styles/nav.css', 'utf8');
  const cookieCss = readFileSync('src/styles/cookieConsent.css', 'utf8');

  it('keeps the expanded menu in its own viewport-sized opaque drawer', () => {
    expect(navCss).toMatch(/@media\s*\(max-width:\s*49\.99em\)\s*\{[\s\S]*?backdrop-filter:\s*none/);
    expect(navCss).toMatch(/\.menu-content\s*\{[^}]*position:\s*fixed[^}]*top:\s*3\.5rem[^}]*bottom:\s*0/);
    expect(navCss).toMatch(/\.nav-items\s*\{[^}]*overflow-y:\s*auto/);
    expect(navCss).toMatch(/\.menu-footer\s*\{[^}]*flex:\s*0\s+0\s+auto/);
  });

  it('anchors the cookie notice above the mobile safe area', () => {
    expect(cookieCss).toContain('bottom:max(.5rem,env(safe-area-inset-bottom))');
  });
});
