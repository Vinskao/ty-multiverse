import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

// 2026-11-09: the show is live on Spotify. 2026-11-10: the player moved out of the hero (now title + search) into the
// briefing zone, beside the recent company events.
describe('homepage Spotify podcast embed', () => {
  const html = read('src/pages/index.astro');
  const css = read('src/styles/index.css');

  it('embeds the Birch Investments show, lazy loaded, in the briefing row before the company events', () => {
    expect(html).toContain('https://open.spotify.com/embed/show/6c674Xq9as5ugqva8aqimV');
    expect(html).toContain('loading="lazy"');
    const zone = html.indexOf('id="zone-briefing"');
    const row = html.indexOf('home-briefing-row');
    const embed = html.indexOf('hero-podcast');
    const events = html.indexOf('id="market-company-events"');
    expect(html.indexOf('id="home-hero-search"')).toBeLessThan(zone);
    expect(zone).toBeLessThan(row);
    expect(row).toBeLessThan(embed);
    expect(embed).toBeLessThan(events);
  });

  it('names the player for screen readers', () => {
    expect(html).toMatch(/<iframe[^>]*title="[^"]+"/);
  });

  it('puts the player and the events side by side on wide screens and stacks below', () => {
    expect(css).toContain('.hero-podcast');
    expect(css).toMatch(/\.home-briefing-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/);
    expect(css).toMatch(/min-width:\s*900px[^}]*home-briefing-row[^}]*grid-template-columns/s);
  });
});
