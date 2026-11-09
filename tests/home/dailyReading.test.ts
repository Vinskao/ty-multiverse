import { describe, expect, it } from 'vitest';
import { dailyReadingTitle } from '../../src/scripts/home/dailyReading';

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
