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

it('offers each catalog subject and nests Maya and semiconductors under their subjects', () => {
  const page = readFileSync(resolve(__dirname, '../../src/pages/learn.astro'), 'utf8');
  expect(page).toContain('learnCatalog.map(subject =>');
  expect(page).toContain("subject.id === 'macroeconomics' && <button id=\"learn-maya-open\"");
  expect(page).toContain("subject.id === 'microeconomics' && <button");
  expect(page).toContain('node.dataset.catalogSubject !== button.dataset.subjectId');
  expect(page).toContain('node.dataset.catalogCourse !== button.dataset.courseId');
  const css = readFileSync(resolve(__dirname, '../../src/styles/learn.css'), 'utf8');
  expect(css).toMatch(/\.learn-course\[hidden\],\s*\.learn-subject\[hidden\]\s*\{\s*display:\s*none/);
});
