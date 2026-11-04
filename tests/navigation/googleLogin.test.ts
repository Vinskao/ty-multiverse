import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('places the account control at the end of navigation and offers Google sign-in', () => {
  const nav = readFileSync('src/components/Nav.astro', 'utf8');
  expect(nav).toContain('class="nav-auth"');
  expect(nav).toContain('data-google-login');
  expect(nav.indexOf('data-google-login')).toBeGreaterThan(nav.indexOf('<NotificationCenter />'));
});

it('uses the Google identity provider only when explicitly requested', () => {
  const page = readFileSync('src/pages/login.astro', 'utf8');
  expect(page).toContain("Astro.url.searchParams.get('provider') === 'google'");
  expect(page).toContain('kc_idp_hint=google');
});
