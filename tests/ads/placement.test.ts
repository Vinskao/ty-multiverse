import { expect, it } from 'vitest';
import { showsPublisherAds } from '../../src/scripts/ads/placement';

it.each(['/', '/reports/', '/macro', '/stocks/', '/work/', '/work/an-article/', '/about/', '/api-reference/', '/api/', '/blog/', '/blog/an-article/', '/learn/', '/learn/?username=x', '/some-new-page/'])('shows ads on %s', path => {
  expect(showsPublisherAds(path)).toBe(true);
});

it.each(['/palais', '/palais/', '/palais/party/', '/login/', '/work/manage/', '/privacy/'])('keeps %s free of ads', path => {
  expect(showsPublisherAds(path)).toBe(false);
});
