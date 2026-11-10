import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

// 2026-11-10: the homepage is the entry point to public research. Search is the main action; only the signed-in
// owner can upload, so visitors are offered "suggest a source" instead of a contribute button that leads nowhere.
it('leads with search over public research and keeps paid Miner access secondary', () => {
  const home = JSON.parse(readFileSync('src/storages/i18n.json', 'utf8')).home;
  const page = readFileSync('src/pages/index.astro', 'utf8');
  expect(home.heroTitle.en).toContain('research');
  expect(home.heroTagline.en).toContain('source');
  expect(home.heroTagline.zh).toContain('來源');
  expect(home.productPricingTitle.en).toContain('Miner');
  document.body.innerHTML = page;
  const header = document.querySelector('.hero-header')!;
  const search = header.querySelector('form#home-hero-search');
  expect(search?.getAttribute('role')).toBe('search');
  expect(search?.querySelector('input[type="search"]')).not.toBeNull();
  expect(search?.querySelector('button[type="submit"]')).not.toBeNull();
  const actions = header.querySelector('.home-product-actions');
  expect(search!.compareDocumentPosition(actions!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(actions?.querySelector('[data-contact-topic="trial"]')).toBeNull();
  expect(actions?.querySelector('a[href="#research-zone"]')).not.toBeNull();
  expect(actions?.querySelector('a[data-contact-topic="data"][data-i18n="home.heroSuggestSource"]')).not.toBeNull();
  const upload = actions?.querySelector('a[href="#market-reports"]');
  expect(upload?.hasAttribute('data-report-owner-only') && upload?.hasAttribute('hidden')).toBe(true);
  expect(document.querySelector('details.home-miner [data-contact-topic="trial"]')).not.toBeNull();
  expect(page).toContain('data-i18n="home.marketOpportunityTitle"');
});

it('shows library numbers and the topic ranking only from server data, never invented figures', () => {
  const page = readFileSync('src/pages/index.astro', 'utf8');
  expect(page).toContain("import { getReportStats } from '../services/server/reportStats'");
  expect(page).toMatch(/reportStats && reportStats\.reports > 0 &&[\s\S]*class="home-report-stats"/);
  expect(page).toMatch(/ranking\.length > 0 &&[\s\S]*class="home-topic-ranking"/);
  expect(page).toContain('data-report-topic={topic.tagId}');
  expect(page).not.toMatch(/class="home-report-stats"[\s\S]{0,400}<dd>\d/); // no hard-coded numbers
  const script = readFileSync('src/scripts/index.ts', 'utf8');
  expect(script).toContain('initHeroSearch(document');
  expect(script).toContain("'[data-report-owner-only]'");
});
