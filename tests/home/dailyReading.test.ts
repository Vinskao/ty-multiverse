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
