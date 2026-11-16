import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MACRO_VOLATILITY_CHARTS } from '../../src/scripts/market/macroLayout';
import { liveReadout, withLivePoint, type LiveVolatility } from '../../src/scripts/market/macroLive';

// 2026-11-16: the macro page opens with the Taiwan VIX (TAIFEX) and the U.S. VIX, above the 場內／場外 rate charts, updated live.
const live: LiveVolatility = { value: 44.68, previousClose: 37.84, high: 45.42, low: 40.83, open: 40.83, change: 6.84, changePercent: 18.08,
  asOf: '2026-11-16T12:30:00+08:00', date: '2026-11-16' };

describe('volatility charts at the top of the macro page', () => {
  it('puts the Taiwan VIX on the left and the U.S. VIX on the right', () => {
    expect(MACRO_VOLATILITY_CHARTS.map((chart) => chart.code)).toEqual(['TW_VIX', 'US_VIX']);
    expect(MACRO_VOLATILITY_CHARTS[0].title.zh).toContain('台指選擇權波動率指數');
    expect(MACRO_VOLATILITY_CHARTS[1].title.zh).toContain('VIX');
  });

  it('sits above the borrowing-rate charts on the page', () => {
    const page = readFileSync('src/pages/index.astro', 'utf8');
    expect(page.indexOf('id="macro-volatility"')).toBeGreaterThan(0);
    expect(page.indexOf('id="macro-volatility"')).toBeLessThan(page.indexOf('id="macro-borrowing"'));
  });
});

describe('the live reading joins the daily history', () => {
  const history = [{ period: '2026-11-12', value: '40.28' }, { period: '2026-11-13', value: '37.84' }];

  it("appends today's reading as the latest point", () => {
    expect(withLivePoint(history, live)).toEqual([...history, { period: '2026-11-16', value: '44.68' }]);
  });

  it("replaces the stored point of the same day instead of duplicating it", () => {
    const withToday = [...history, { period: '2026-11-16', value: '40.00' }];
    expect(withLivePoint(withToday, live).at(-1)).toEqual({ period: '2026-11-16', value: '44.68' });
    expect(withLivePoint(withToday, live)).toHaveLength(3);
  });

  it('ignores a reading older than the newest stored day, and a missing reading', () => {
    expect(withLivePoint(history, { ...live, date: '2026-11-10' })).toEqual(history);
    expect(withLivePoint(history, null)).toEqual(history);
    expect(withLivePoint(undefined, live)).toEqual([{ period: '2026-11-16', value: '44.68' }]);
  });

  it('does not change the stored history array', () => {
    const copy = [...history];
    withLivePoint(history, live);
    expect(history).toEqual(copy);
  });
});

describe('live readout line', () => {
  it('shows the value, the move, the day range and the time', () => {
    const zh = liveReadout(live, 'zh');
    expect(zh).toContain('44.68');
    expect(zh).toContain('+6.84');
    expect(zh).toContain('+18.08%');
    expect(zh).toContain('高 45.42');
    expect(zh).toContain('低 40.83');
    expect(zh).toContain('12:30');
    expect(liveReadout(live, 'en')).toContain('High 45.42');
  });

  it('shows a fall with its minus sign and copes with a missing prior close', () => {
    expect(liveReadout({ ...live, value: 30, change: -7.84, changePercent: -20.72 }, 'zh')).toContain('-7.84');
    const bare = liveReadout({ ...live, previousClose: null, change: null, changePercent: null }, 'zh');
    expect(bare).toContain('44.68');
    expect(bare).not.toContain('null');
  });

  it('says nothing when there is no reading', () => {
    expect(liveReadout(null, 'zh')).toBe('');
  });
});
