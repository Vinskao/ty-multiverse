import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { learnCatalog, groupLearnTopics } from '../../src/scripts/learn/catalog';

describe('learning catalog', () => {
  it('places TOEIC under English and plans economics and software subjects without creating quizzes', () => {
    expect(learnCatalog.map(x => x.id)).toEqual(['english', 'macroeconomics', 'microeconomics', 'object-oriented']);
    expect(learnCatalog[0].courses[0]).toMatchObject({ id: 'toeic', status: 'available' });
    expect(learnCatalog.slice(1).flatMap(x => x.courses).every(x => x.status === 'planned')).toBe(true);
    expect(learnCatalog.slice(1).every(x => x.courses.length >= 3)).toBe(true);
  });
  it('keeps every existing TOEIC quiz, including unknown future topic IDs', () => {
    const topics = [{id:'toeic-01-grammar'}, {id:'toeic-02-reading'}, {id:'future-topic'}];
    expect(groupLearnTopics(topics).toeic).toEqual(topics.slice(0, 2));
    expect(groupLearnTopics(topics).other).toEqual(topics.slice(2));
  });
  it('includes semiconductors under microeconomics', () => {
    expect(learnCatalog.find(subject => subject.id === 'microeconomics')?.courses)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'semiconductor', status: 'planned' })]));
  });
  it('forces the sidebar topic list to remain a single column', () => {
    const css = readFileSync('src/styles/learn.css', 'utf8');
    expect(css).toMatch(/\.learn-topics\s*\{[^}]*grid-auto-flow:\s*row/s);
  });
});

it('keeps planned topics separate from live quizzes and handles an unavailable topic service', () => {
  const page = readFileSync('src/pages/learn.astro', 'utf8');
  expect(page).toContain('course.status === \'available\'');
  expect(page).toContain('題庫暫時無法載入，請稍後重新整理。');
  expect(page).toContain('openTopic(button.dataset.topicId)');
});
