import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { currentPageKey } from '../../src/scripts/navigation/menu';

describe('which page the nav brand says you are on', () => {
  // 2026-10-30: the owner wanted the current page shown next to "TY Multiverse" in the nav.
  it('maps each top-level section to its nav i18n key', () => {
    expect(currentPageKey('/tymultiverse/')).toBe('nav.home');
    expect(currentPageKey('/tymultiverse')).toBe('nav.home');
    expect(currentPageKey('/tymultiverse/index.html')).toBe('nav.home');
    expect(currentPageKey('/tymultiverse/about/')).toBe('nav.about');
    expect(currentPageKey('/tymultiverse/work/some-article')).toBe('nav.work');
    expect(currentPageKey('/tymultiverse/api-reference/')).toBe('nav.api');
    expect(currentPageKey('/tymultiverse/learn/')).toBe('nav.learn');
    expect(currentPageKey('/tymultiverse/palais/group')).toBe('nav.palais');
    expect(currentPageKey('/tymultiverse/login')).toBe('nav.login');
  });

  it('says nothing for pages outside the menu, instead of guessing', () => {
    expect(currentPageKey('/tymultiverse/ai-usage/')).toBeNull();
    expect(currentPageKey('/elsewhere')).toBeNull();
  });

  it('does not mistake a page whose name merely starts like another', () => {
    expect(currentPageKey('/tymultiverse/aboutus')).toBeNull();
    expect(currentPageKey('/tymultiverse/worksheet')).toBeNull();
  });

  it('shows it in the brand area, translated like the rest of the nav', () => {
    const nav = readFileSync('src/components/Nav.astro', 'utf8');
    expect(nav).toContain('currentPageKey(currentPath)');
    expect(nav).toMatch(/class="site-page"[^>]*aria-current="page"[^>]*data-i18n=\{pageKey\}/);
  });
});
