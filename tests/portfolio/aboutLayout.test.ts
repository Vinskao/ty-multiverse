import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('keeps the About introduction free of the large decorative landscape', () => {
  const page = readFileSync(resolve(__dirname, '../../src/pages/about.astro'), 'utf8');
  expect(page).not.toContain('src="/tymultiverse/assets/zen-landscape.svg"');
  expect(page).not.toContain('class="work-photo-overlay"');
  expect(page).toContain('data-admin-git-commit hidden');
  expect(page).not.toContain('!panel || !image');
});
