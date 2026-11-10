import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const navCss = readFileSync('src/styles/nav.css', 'utf8');
const cookieCss = readFileSync('src/styles/cookieConsent.css', 'utf8');

function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`, 'g'))]
    .map((match) => match[1])
    .join('\n');
}

describe('top nav controls share a consistent hit area', () => {
  it('uses the same control height for language, notifications, cookie settings and login', () => {
    expect(navCss).toMatch(/--nav-control-size:\s*2\.5rem/);
    expect(rule(navCss, '.lang-toggle-btn')).toMatch(/height:\s*var\(--nav-control-size\)/);
    expect(rule(navCss, '.notification-bell')).toMatch(/height:\s*var\(--nav-control-size\)/);
    expect(rule(cookieCss, '.cookie-gear')).toMatch(/height:\s*var\(--nav-control-size\)/);
    expect(rule(navCss, '.nav-auth-trigger')).toMatch(/height:\s*var\(--nav-control-size\)/);
  });

  it('keeps the bell and icon-only settings control square', () => {
    expect(rule(navCss, '.notification-bell')).toMatch(/width:\s*var\(--nav-control-size\)/);
    expect(rule(cookieCss, '.cookie-gear')).toMatch(/width:\s*var\(--nav-control-size\)/);
  });
});
