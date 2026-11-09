import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

// 2026-11-09: the show is live on Spotify; the homepage hero shows its player in the empty middle between title and events.
describe('homepage Spotify podcast embed', () => {
  const html = read('src/pages/index.astro');
  const css = read('src/styles/index.css');

  it('embeds the Birch Investments show, lazy loaded, inside the hero title row between title and events', () => {
    expect(html).toContain('https://open.spotify.com/embed/show/6c674Xq9as5ugqva8aqimV');
    expect(html).toContain('loading="lazy"');
    const row = html.indexOf('hero-title-row');
    const title = html.indexOf('hero-title-block');
    const embed = html.indexOf('hero-podcast');
    const events = html.indexOf('id="market-company-events"');
    expect(row).toBeLessThan(title);
    expect(title).toBeLessThan(embed);
    expect(embed).toBeLessThan(events);
  });

  it('names the player for screen readers', () => {
    expect(html).toMatch(/<iframe[^>]*title="[^"]+"/);
  });

  it('uses three columns on wide screens and stacks below', () => {
    expect(css).toContain('.hero-podcast');
    expect(css).toMatch(/min-width:\s*1200px[^}]*hero-title-row[^}]*grid-template-columns/s);
  });
});
