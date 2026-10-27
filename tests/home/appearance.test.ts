import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const base = read('src/styles/base-layout.css');
const toggle = read('src/styles/theme-toggle.css');
const global = read('src/styles/global.css');
const block = (css: string, selector: string) => {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no rule for ${selector}`);
  return css.slice(start, css.indexOf('}', start) + 1);
};
const indexCss = read('src/styles/index.css');

// 2026-10-27: the page background went from gradient art + noise images to a flat, Apple-style surface.
describe('flat page background', () => {
  it('paints the page with the plain surface colour only, no images, noise or blend modes', () => {
    const backgrounds = block(base, '.backgrounds');
    expect(backgrounds).toMatch(/background:\s*var\(--gray-999\)/);
    expect(backgrounds).not.toMatch(/url\(|gradient|blend-mode/);
  });

  it('no longer loads the header, footer and noise artwork anywhere', () => {
    expect(base).not.toMatch(/assets\/backgrounds/);
    expect(indexCss).not.toMatch(/assets\/backgrounds|noise\.png/);
    expect(block(indexCss, '.with-background::before')).toMatch(/content:\s*none/);
  });

  it('uses Apple-like surfaces: pure black in dark, off-white in light', () => {
    expect(block(global, ':root.theme-dark')).toMatch(/--gray-999:\s*#000000/);
    expect(block(global, ':root')).toMatch(/--gray-999:\s*#fbfbfd/);
  });

  it('defines the full grey scale for light mode too, so cards do not fall back to nothing', () => {
    const light = block(global, ':root');
    for (const step of [400, 500, 600, 700, 800, 900]) expect(light).toContain(`--gray-${step}:`);
  });
});

describe('theme toggle styling', () => {
  it('is a quiet frosted button without the pulse, spin or coloured track', () => {
    expect(toggle).not.toMatch(/animation:/);
    expect(toggle).not.toMatch(/@keyframes/);
    expect(toggle).not.toMatch(/#FFD700|#1E3A8A/i);
    expect(block(toggle, 'body .theme-toggle')).toMatch(/backdrop-filter/);
  });

  it('turns the half-moon over when the theme is dark and respects reduced motion', () => {
    expect(toggle).toMatch(/\.theme-dark body \.theme-toggle svg\s*\{[^}]*rotate\(180deg\)/);
    expect(toggle).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});
