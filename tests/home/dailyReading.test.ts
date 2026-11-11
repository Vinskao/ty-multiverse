import { describe, expect, it } from 'vitest';
import { dailyReadingTitle, dailyPresenterName } from '../../src/scripts/home/dailyReading';

describe('homepage daily reading title', () => {
  it('uses the episode title when the approved reading has one', () => {
    expect(dailyReadingTitle({ title: '淨流動性轉寬與聯發科出貨驗證' })).toBe('淨流動性轉寬與聯發科出貨驗證');
  });

  it('trims the title and ignores blanks so older readings show no heading', () => {
    expect(dailyReadingTitle({ title: '  標題  ' })).toBe('標題');
    expect(dailyReadingTitle({ title: '   ' })).toBeNull();
    expect(dailyReadingTitle({ title: null })).toBeNull();
    expect(dailyReadingTitle({})).toBeNull();
    expect(dailyReadingTitle(null)).toBeNull();
  });

  it('does not repeat the dated default title the API adds to untitled episodes', () => {
    expect(dailyReadingTitle({ title: '每日市場精讀｜2026/11/09' })).toBeNull();
  });

  it('is wired into the homepage script', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const page = readFileSync(resolve(__dirname, '../../src/pages/index.astro'), 'utf8');
    expect(page).toContain('dailyReadingTitle');
  });
});

describe('presenter named on the homepage card', () => {
  // Mirrors maya-sawa config/market-presenters.json (Mon..Sun): maya, duo, maya, uiobbeci, maya, uiobbeci, duo.
  // A duo day is voiced by Uiobbeci, and the audio opens with "早安，我是主播Uiobbeci".
  it('follows the weekday of the reading, not a fixed name', () => {
    const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'];
    expect(days.map(dailyPresenterName)).toEqual(['Maya', 'Uiobbeci', 'Maya', 'Uiobbeci', 'Maya', 'Uiobbeci', 'Uiobbeci']);
  });
  it('falls back to Maya for a missing or malformed day', () => {
    expect(dailyPresenterName(undefined)).toBe('Maya');
    expect(dailyPresenterName('not-a-day')).toBe('Maya');
  });
  it('is used for the card heading instead of a hardcoded name', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const page = readFileSync(resolve(__dirname, '../../src/pages/index.astro'), 'utf8');
    expect(page).not.toContain('>Maya 主播每日精讀<');
    expect(page).toContain('dailyPresenterName');
  });
});

describe('homepage daily reading body', () => {
  it('lays out the reader version as headings and paragraphs', async () => {
    const { dailyReadingBlocks } = await import('../../src/scripts/home/dailyReading');
    const reading = '## 總經：淨流動性\n\n淨流動性較上月增加 1.2%。\n這支撐評價倍數。\n\n## 個股：聯發科\n\n10 月營收年增 12.5%。';
    expect(dailyReadingBlocks({ reading, content: '朗讀稿。' })).toEqual([
      { kind: 'heading', text: '總經：淨流動性' },
      { kind: 'paragraph', text: '淨流動性較上月增加 1.2%。\n這支撐評價倍數。' },
      { kind: 'heading', text: '個股：聯發科' },
      { kind: 'paragraph', text: '10 月營收年增 12.5%。' },
    ]);
  });

  it('breaks an older speech-only script into short paragraphs instead of one glued block', async () => {
    const { dailyReadingBlocks } = await import('../../src/scripts/home/dailyReading');
    const content = '第一句。第二句。第三句。第四句。第五句。第六句。第七句。';
    const blocks = dailyReadingBlocks({ content, reading: null });
    expect(blocks.map(block => block.kind)).toEqual(['paragraph', 'paragraph', 'paragraph']);
    expect(blocks.map(block => block.text).join('')).toBe(content);
    expect(dailyReadingBlocks({ content: '百分之一點五。' })).toEqual([{ kind: 'paragraph', text: '百分之一點五。' }]);
    expect(dailyReadingBlocks(null)).toEqual([]);
  });

  it('is wired into the homepage script', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const page = readFileSync(resolve(__dirname, '../../src/pages/index.astro'), 'utf8');
    expect(page).toContain('dailyReadingBlocks');
    expect(page).not.toContain('content.textContent = latest.content');
  });
});
