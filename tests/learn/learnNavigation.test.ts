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
  expect(page).toContain('node.dataset.catalogSubject !== button.dataset.subjectId');
  expect(page).toContain('node.dataset.catalogCourse !== button.dataset.courseId');
  const css = readFileSync(resolve(__dirname, '../../src/styles/learn.css'), 'utf8');
  expect(css).toMatch(/\.learn-course\[hidden\],\s*\.learn-subject\[hidden\]\s*\{\s*display:\s*none/);
});

it('opens every subject into same-level sub-items generated from the catalog, with 市場快報 beside the macro courses', () => {
  const page = readFileSync(resolve(__dirname, '../../src/pages/learn.astro'), 'utf8');
  // one sidebar sub-item per catalog course, for every subject (英文 → TOEIC, 總體經濟 → 通膨… , 個體經濟, 物件導向)
  expect(page).toMatch(/subject\.courses\.map\(course => <button[^>]*data-submenu=\{subject\.id\}[^>]*data-course-id=\{course\.id\}/);
  // the market briefing is a sibling of the macro courses, not a child of anything else
  const macro = page.indexOf("subject.id === 'macroeconomics' && <button id=\"learn-maya-open\"");
  const courses = page.indexOf('subject.courses.map(course => <button');
  expect(courses).toBeGreaterThan(-1);
  expect(macro).toBeGreaterThan(courses);
  expect(page.slice(macro, macro + 260)).toContain('data-submenu="macroeconomics"');
  // 英文 keeps the loaded TOEIC topics under its TOEIC item
  expect(page).toContain('id="learn-topics"');
});

it('lists the sub-items the user named', async () => {
  const { learnCatalog } = await import('../../src/scripts/learn/catalog');
  const titles = (id: string) => learnCatalog.find(subject => subject.id === id)!.courses.map(course => course.title);
  expect(titles('english')).toContain('多益 TOEIC');
  expect(titles('macroeconomics')).toEqual(['通膨與物價', '利率與貨幣政策', '就業與消費', '貿易與匯率']);
});

it('shows semiconductor chapter headings and their subtopics without lesson content', async () => {
  const { learnCatalog } = await import('../../src/scripts/learn/catalog');
  const semiconductor = learnCatalog.flatMap(subject => subject.courses).find(course => course.id === 'semiconductor');
  expect(semiconductor?.outline?.flatMap(chapter => chapter.titles)).toEqual(expect.arrayContaining([
    '離子植入與摻雜', 'CMP 化學機械平坦化', 'AI 晶片、HBM 與 CoWoS',
  ]));
  expect(semiconductor?.status).toBe('planned');
});
