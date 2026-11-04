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

it('opens TOEIC from the catalog and reloads audio after page navigation', () => {
  const page = readFileSync(resolve(__dirname, '../../src/pages/learn.astro'), 'utf8');
  expect(page).toContain('data-learn-toeic');
  expect(page).toContain('openTopic(toeic[0].id)');
  expect(page).toContain('document.addEventListener("astro:page-load", loadMarketAudio)');
});

it('keeps the sidebar tabs in a single column despite global navigation styles', () => {
  const css = readFileSync(resolve(__dirname, '../../src/styles/learn.css'), 'utf8');
  expect(css).toMatch(/\.learn-sidebar\s+\.learn-subject-menu\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  expect(css).toMatch(/\.learn-sidebar\s+\.learn-subject-menu\s*\{[^}]*position:\s*static/s);
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
