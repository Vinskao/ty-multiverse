import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The site is a one-person team; the About heading must not suggest a larger one.
describe('About team heading', () => {
  const page = readFileSync('src/pages/about.astro', 'utf8');
  const heading = page.match(/id="team-section-title">\{lang === "zh" \? "([^"]*)" : "([^"]*)"\}/);

  it('says the team is one person in both languages', () => {
    expect(heading?.[1]).toBe('一人打造、一人營運');
    expect(heading?.[2]).toBe('Built and run by one person.');
  });
  it('no longer claims a growing or open team', () => {
    expect(page).not.toMatch(/Open to many|持續擴大|Built by one\./);
  });
});
