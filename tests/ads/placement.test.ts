import { expect, it } from 'vitest';
import { showsPublisherAds } from '../../src/scripts/ads/placement';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

it.each(['/', '/reports/', '/macro', '/stocks/', '/work/', '/work/an-article/', '/about/', '/api-reference/', '/api/', '/blog/', '/blog/an-article/', '/learn/', '/learn/?username=x', '/some-new-page/'])('shows ads on %s', path => {
  expect(showsPublisherAds(path)).toBe(true);
});

it.each(['/palais', '/palais/', '/palais/party/', '/palais/group/', '/palais/live/', '/login/', '/work/manage/', '/privacy/'])('keeps %s free of ads', path => {
  expect(showsPublisherAds(path)).toBe(false);
});

it('keeps the ad controller on ad-free routes so it can remove overlays from the prior page', () => {
  const layout = readFileSync(resolve(process.cwd(), 'src/layouts/BaseLayout.astro'), 'utf8');
  expect(layout).toContain('<MonetagInPagePush showSlot={showsPublisherAds(Astro.url.pathname)} />');
  expect(layout).not.toContain('{showsPublisherAds(Astro.url.pathname) && <MonetagInPagePush');
});
