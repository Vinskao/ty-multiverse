import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('puts Maya audio in its own selectable view outside the course overview', () => {
  const page = readFileSync(resolve(__dirname, '../../src/pages/learn.astro'), 'utf8');
  const overview = page.slice(page.indexOf('<section id="learn-overview"'), page.indexOf('<section id="learn-audio"'));
  expect(page).toContain('id="learn-audio"');
  expect(overview).not.toContain('market-audio-title');
  expect(page).toContain('id="learn-maya-open"');
  expect(page).toContain('"audio"');
});
