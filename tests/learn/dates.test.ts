import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { learnDate } from '../../src/scripts/learn/dates';

describe('learnDate', () => {
  it('reads epoch seconds, milliseconds and ISO strings as the same day', () => {
    const iso = '2026-11-27T06:00:00Z';
    const ms = Date.parse(iso);
    expect(learnDate(iso).getTime()).toBe(ms);
    expect(learnDate(ms).getTime()).toBe(ms);
    expect(learnDate(String(ms)).getTime()).toBe(ms);
    expect(learnDate(ms / 1000).getTime()).toBe(ms);
    expect(learnDate(String(ms / 1000)).getTime()).toBe(ms);
  });
  it('shows the overview poster before the clips load, and no learn date is built from a raw new Date', () => {
    const page = readFileSync('src/pages/learn.astro', 'utf8');
    expect(page).toContain('poster="/assets/learn-poster-walking.jpg"');
    expect(page).not.toMatch(/new Date\((row|learner|topic|item)\./);
    const css = readFileSync('src/styles/learn.css', 'utf8');
    expect(css).toMatch(/\.learn-catalog-video:not\(\.is-playing\) \{[^}]*learn-poster-walking\.jpg/);
    expect(css).toMatch(/\.learn-catalog-video \{[^}]*background: #000;/); // black bars beside a playing clip
    expect(readFileSync('src/scripts/learn/catalogVideo.ts', 'utf8')).toContain("classList.add('is-playing')");
  });
});
