import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

it('keeps outline and danger buttons readable in dark mode', () => {
  const css = read('src/styles/global.css');
  // The dark .btn text is near-black, which vanished on the transparent outline button.
  expect(css).toMatch(/:root\.theme-dark \.btn\.is-outline\s*\{[^}]*color:\s*var\(--gray-0\)/);
  expect(css).toMatch(/:root\.theme-dark \.btn\.is-danger\s*\{[^}]*color:\s*#ffffff/);
  // a disabled button must not light up on hover
  expect(css).toMatch(/\.btn:disabled:hover/);
});

it('styles the party controls with theme variables instead of hard-coded dark colors', () => {
  const page = read('src/pages/palais/party.astro');
  expect(page).not.toContain('background: #333');
  expect(page).toContain('class="party-select"');
  expect(read('src/styles/party.css')).toMatch(/\.party-select\s*\{[^}]*var\(--gray-/);
});

it('adds a download button to the group page basket that merges everyone into one row', () => {
  const page = read('src/pages/palais/group.astro');
  expect(page).toContain('id="cart-download"');
  expect(page).toContain("from '../../scripts/palais/singleRow'");
  // the button follows the cart: disabled when empty, hidden while the basket is minimized
  expect(page).toMatch(/downloadBtn\.disabled\s*=\s*items\.children\.length === 0/);
  expect(page).toMatch(/#palais-cart\.minimized #cart-download/);
});
