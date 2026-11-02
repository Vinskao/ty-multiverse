import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('centres the shared research platform and keeps paid Miner access secondary', () => {
  const home = JSON.parse(readFileSync('src/storages/i18n.json', 'utf8')).home;
  const page = readFileSync('src/pages/index.astro', 'utf8');
  expect(home.heroTitle.en).toContain('research');
  expect(home.heroTagline.en).toContain('reports');
  expect(home.heroTagline.zh).toContain('互利共生');
  expect(home.productPricingTitle.en).toContain('Miner');
  document.body.innerHTML = page;
  const actions = document.querySelector('.home-product-actions');
  expect(actions?.querySelector('[data-contact-topic="trial"]')).toBeNull();
  expect(actions?.querySelector('a[href="#research-zone"]')).not.toBeNull();
  expect(document.querySelector('details.home-miner [data-contact-topic="trial"]')).not.toBeNull();
  expect(page).toContain('data-i18n="home.marketOpportunityTitle"');
});
