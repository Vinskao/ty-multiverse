import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

// 2026-11-09: the settings gear drew off-centre (a translate(-1 -1) on an asymmetric path) and looked small in its circle.
describe('cookie settings gear icon', () => {
  const html = read('src/components/CookieConsent.astro');
  const gear = html.slice(html.indexOf('data-cookie-gear'), html.indexOf('</button>'));

  it('is drawn centred: no translate shift, hub circle at the middle of the 24 grid', () => {
    expect(gear).not.toContain('transform=');
    expect(gear).toContain('<circle cx="12" cy="12"');
  });

  it('is large enough to read inside the 3rem circle', () => {
    expect(gear).toMatch(/width="2[2-6]" height="2[2-6]"/);
  });
});
