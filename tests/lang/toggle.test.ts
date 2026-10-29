import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { langToggleState } from '../../src/scripts/lang/toggle';

describe('single-button language switch', () => {
  // 2026-10-29: the owner wanted one button instead of two; clicking it flips the language and slides the black pill.
  it('flips to the other language and names that target for screen readers', () => {
    expect(langToggleState('zh')).toEqual({ lang: 'zh', next: 'en', label: 'Switch to English' });
    expect(langToggleState('en')).toEqual({ lang: 'en', next: 'zh', label: '切換為繁體中文' });
  });

  it('treats anything unknown as Chinese, the site default', () => {
    expect(langToggleState(undefined).lang).toBe('zh');
    expect(langToggleState('ja').next).toBe('en');
  });

  it('renders as one button, not a group of two', () => {
    const nav = readFileSync('src/components/Nav.astro', 'utf8');
    const start = nav.indexOf('id="langToggleBtn"');
    const tagStart = nav.lastIndexOf('<', start);
    expect(nav.slice(tagStart, start)).toContain('<button');
    const end = nav.indexOf('</button>', start);
    expect(nav.slice(start, end)).not.toContain('<button');
  });
});
