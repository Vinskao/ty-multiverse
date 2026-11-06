import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('keeps the About introduction free of the large decorative landscape', () => {
  const page = readFileSync(resolve(__dirname, '../../src/pages/about.astro'), 'utf8');
  expect(page).not.toContain('src="/assets/zen-landscape.svg"');
  expect(page).not.toContain('class="work-photo-overlay"');
  expect(page).toContain('data-admin-git-commit hidden');
  expect(page).not.toContain('!panel || !image');
});

it('keeps the founder profile in one readable desktop column', () => {
  const styles = readFileSync(resolve(__dirname, '../../src/styles/about.css'), 'utf8');
  expect(styles).toMatch(/main\.about\.about-mono\s*\{[^}]*display:\s*flex/s);
  expect(styles).toMatch(/main\.about\.about-mono\s*\{[^}]*flex-direction:\s*column/s);
  expect(styles).toMatch(/\.about-mono\s+\.founder-overview\s*>\s*section\s*\{[^}]*display:\s*block/s);
});

it('re-runs the About language controller after Astro view transitions', () => {
  const page = readFileSync(resolve(__dirname, '../../src/pages/about.astro'), 'utf8');
  expect(page).toMatch(/<script>\s*import \{ bindAboutLanguage, prefetchAboutLanguage, replaceAboutContent \}/);
  expect(page).toContain('document.addEventListener("astro:page-load", syncAboutLanguage)');
  expect(page).toContain('bindAboutLanguage');
  expect(page).toContain('lang={lang === "zh" ? "zh-Hant" : "en"}');
});

it('places recruiting alongside the founder and uses a centered autoplay video', () => {
  const page = readFileSync(resolve(__dirname, '../../src/pages/about.astro'), 'utf8');
  expect(page.indexOf('class="team-recruitment"')).toBeGreaterThan(page.indexOf('id="team-section-title"'));
  expect(page.indexOf('class="team-recruitment"')).toBeLessThan(page.indexOf('class="team-member"'));
  expect(page).toContain('<video autoplay preload="auto" playsinline');
  expect(page).not.toContain('founder-play');
  expect(page).not.toMatch(/<video[^>]*loop/);
  expect(page).not.toContain('>?</button>');
  expect(page).not.toContain('<video controls');
});
