import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { currentPageKey } from '../../src/scripts/navigation/menu';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

// 2026-11-10: reports are the main product, so they lead the nav and get their own page; macro and stocks follow, each on its own page.
describe('reports, macro and stocks pages', () => {
  it('leads the menu with Reports, then Macro, then Stocks', () => {
    const nav = read('src/components/Nav.astro');
    const at = (key: string) => nav.indexOf(`i18nKey: "${key}"`);
    expect(at('nav.reports')).toBeGreaterThan(-1);
    expect(at('nav.reports')).toBeLessThan(at('nav.macro'));
    expect(at('nav.macro')).toBeLessThan(at('nav.stocks'));
    expect(at('nav.stocks')).toBeLessThan(at('nav.home'));
  });

  it('names each page in the brand area', () => {
    expect(currentPageKey('/reports/')).toBe('nav.reports');
    expect(currentPageKey('/macro/')).toBe('nav.macro');
    expect(currentPageKey('/stocks/')).toBe('nav.stocks');
  });

  it('renders the homepage dashboard narrowed to one zone per page', () => {
    for (const view of ['reports', 'macro', 'stocks']) {
      const page = read(`src/pages/${view}.astro`);
      expect(page).toContain(`view="${view}"`);
      expect(page).toContain("from './index.astro'");
    }
    expect(read('src/pages/index.astro')).toContain('data-view={view}');
    const css = read('src/styles/index.css');
    for (const view of ['reports', 'macro', 'stocks']) expect(css).toContain(`.home-page[data-view="${view}"]`);
  });

  it('puts the search trigger in the nav bar', () => {
    expect(read('src/components/Nav.astro')).toContain('<SiteSearch');
    expect(read('src/components/SiteSearch.astro')).toContain('id="site-search-open"');
  });
});
