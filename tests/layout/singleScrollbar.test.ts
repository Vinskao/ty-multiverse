import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// 2026-11-16: /learn (and every long page) showed two vertical scrollbars. `overflow-x: hidden` on body computes overflow-y to
// `auto`, so body (height: 100%) became its own scroll container inside the scrolling html.
const css = readFileSync('src/styles/global.css', 'utf8');
const rule = (selector: string) => [...css.matchAll(/(^|\n)([^{}\n]+)\{([^}]*)\}/g)].filter((m) => m[2].trim() === selector).map((m) => m[3]).join('\n');

describe('only the page scrolls', () => {
  it('does not turn body into a scroll container', () => {
    const body = `${rule('body')}\n${rule('html,\nbody')}`;
    expect(body).not.toMatch(/overflow(?:-x|-y)?\s*:\s*(?:hidden|auto|scroll)/);
  });

  it('still prevents sideways overflow without a second vertical scrollbar', () => {
    expect(rule('body')).toMatch(/overflow-x:\s*clip/);
    expect(rule('html')).toMatch(/overflow-x:\s*hidden/);
  });
});
