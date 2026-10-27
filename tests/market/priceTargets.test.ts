import { beforeEach, expect, it } from 'vitest';
import { firmColors, historyCloses, latestTargets, targetSeries, type TargetAction } from '../../src/scripts/market/priceTargets';
import { renderPriceTargetChart } from '../../src/scripts/market/priceTargetChart';

// LITE from Yahoo upgradeDowngradeHistory (dates are the brokers' New York dates).
const action = (firm: string, date: string, target: number | null, previousTarget: number | null = null, rating = 'Buy', source = 'yahoo'): TargetAction => ({
  firm, date, target, previousTarget, rating, previousRating: null, action: null, currency: 'USD', source, sourceUrl: 'https://finance.yahoo.com/quote/LITE/analysis' });
const actions = [action('Citigroup', '2026-09-29', 1400, 1200), action('Rosenblatt', '2026-09-22', 1300, 1300), action('Rosenblatt', '2026-10-05', 1300, 1300),
  action('Stifel', '2026-10-05', 1232, 1100), action('Jefferies', '2026-10-21', 1250, 1200), action('Wolfe Research', '2025-07-08', null, null, 'Outperform'),
  action('Morgan Stanley', '2025-08-01', 300, 250, 'Equal-Weight')];

it("lists each broker's latest target with its change and upside, newest first, flagging targets over a year old", () => {
  const rows = latestTargets(actions, { date: '2026-10-23', close: 756.17 });
  expect(rows.map(row => row.firm)).toEqual(['Jefferies', 'Rosenblatt', 'Stifel', 'Citigroup', 'Morgan Stanley']); // Wolfe: no target
  expect(rows[0]).toMatchObject({ date: '2026-10-21', target: 1250, previousTarget: 1200, stale: false });
  expect(rows[0].change).toBeCloseTo(1250 / 1200 - 1, 10);
  expect(rows[0].upside).toBeCloseTo(1250 / 756.17 - 1, 10);
  expect(rows.find(row => row.firm === 'Rosenblatt')!.date).toBe('2026-10-05');
  expect(rows.find(row => row.firm === 'Morgan Stanley')!.stale).toBe(true); // 2025-08-01 is more than 365 days before
  expect(latestTargets(actions, null)[0].upside).toBeNull();
  expect(latestTargets([], null)).toEqual([]);
});

it('gives the most active brokers their own colors and groups the rest', () => {
  const colors = firmColors(actions, ['a', 'b'], 2);
  expect(colors.get('Rosenblatt')).toBe('a'); // two targets
  expect(colors.get('Citigroup')).toBe('b'); // ties break by firm name
  expect(colors.get('Jefferies')).toBeUndefined();
});

it('keeps only the window and steps the consensus until the next snapshot', () => {
  const closes = [{ date: '2026-10-01', close: 600 }, { date: '2026-10-05', close: 650 }, { date: '2026-10-21', close: 740 }, { date: '2026-10-23', close: 756.17 }];
  const consensus = [{ date: '2026-10-02', mean: 1100, median: 1150, high: 1400, low: 700, analysts: 26, currency: 'USD', source: 'yahoo' },
    { date: '2026-10-22', mean: 1165, median: 1200, high: 1500, low: 750, analysts: 27, currency: 'USD', source: 'yahoo' }];
  const series = targetSeries(actions, consensus, closes, { start: '2026-10-02', end: '2026-10-23' });
  expect(series.dates).toEqual(['2026-10-02', '2026-10-05', '2026-10-21', '2026-10-22', '2026-10-23']);
  expect(series.close).toEqual([null, 650, 740, null, 756.17]);
  expect(series.consensus.map(row => row?.mean ?? null)).toEqual([1100, 1100, 1100, 1165, 1165]);
  expect(series.dots.map(dot => `${dot.date} ${dot.firm} ${dot.target}`)).toEqual(['2026-10-05 Rosenblatt 1300', '2026-10-05 Stifel 1232', '2026-10-21 Jefferies 1250']);
});

beforeEach(() => { document.body.innerHTML = '<div id="targets-test"></div>'; });
it('draws broker dots and the consensus, reads out the day, and says when there is no per-broker data', () => {
  const closes = [{ date: '2026-10-05', close: 650 }, { date: '2026-10-21', close: 740 }];
  const consensus = [{ date: '2026-10-05', mean: 1100, median: 1150, high: 1400, low: 700, analysts: 26, currency: 'USD', source: 'yahoo' }];
  renderPriceTargetChart('targets-test', { actions, consensus, closes, currency: 'USD', zh: true });
  expect(document.querySelectorAll('[data-target-dot]').length).toBe(5); // one-year window: Morgan Stanley 2025-08 is outside
  expect(document.querySelector('[data-consensus-mean]')).not.toBeNull();
  const svg = document.querySelector('svg')!;
  svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  expect(document.querySelector('.market-chart-readout')!.textContent).toContain('2026-09-22');
  svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  const readout = document.querySelector('.market-chart-readout')!.textContent!;
  expect(readout).toContain('2026-10-05');
  expect(readout).toContain('Stifel');
  expect(readout).toContain('1,232');
  expect(document.querySelector('table')!.textContent).toContain('Jefferies');
  renderPriceTargetChart('targets-test', { actions: [], consensus, closes, currency: 'TWD', zh: true });
  expect(document.body.textContent).toContain('沒有個別券商');
  renderPriceTargetChart('targets-test', { actions: [], consensus: [], closes: [], currency: 'TWD', zh: true });
  expect(document.body.textContent).toContain('尚無目標價資料');
});

it('reads closes from Taiwan history (TWSE or TPEx) and overseas daily bars, skipping missing closes', () => {
  expect(historyCloses([{ date: '2026-10-22', sources: { 'tpex:daily-price': { close: 512 } } },
    { date: '2026-10-21', sources: { 'twse:daily-price': { close: 1450 } } }, { date: '2026-10-20', sources: { 'twse:institutional': {} } }]))
    .toEqual([{ date: '2026-10-21', close: 1450 }, { date: '2026-10-22', close: 512 }]);
  expect(historyCloses(undefined, [{ date: '2026-10-23', close: 756.17 }, { date: '2026-10-22', close: null }])).toEqual([{ date: '2026-10-23', close: 756.17 }]);
});

// 2026-10-27: views on the target timeline — the broker's reasoning (thesis), the report it came from, and public report
// claims about the stock as dated views.
import { actionViews, viewsInWindow, type TargetView } from '../../src/scripts/market/priceTargets';
const REPORT = '83c3ca86-f9c7-49f3-bd30-81060c4c24a0';
const view = (page: number, date: string | null, direction = 'tailwind', publisher = 'Jefferies'): TargetView => ({ reportId: REPORT, title: 'Optical networking', publisher,
  date, page, dimension: 'delivery', direction, claim: `claim p${page}`, evidence: '800G shipments +30% QoQ' });

it("links a broker's target to the claims of the report it came from, or to that broker's views on the same day", () => {
  const linked = { ...action('Jefferies', '2026-10-21', 1250, 1200), reportId: REPORT, thesis: '800G orders visible into 1H27' };
  const views = [view(3, '2026-10-21'), view(5, '2026-10-15'), { ...view(9, '2026-10-21', 'neutral', 'Citigroup'), reportId: 'other' }];
  expect(actionViews(linked, views).map((v) => v.page)).toEqual([3, 5]);
  const unlinked = action('Citigroup', '2026-10-21', 1400, 1200);
  expect(actionViews(unlinked, views).map((v) => v.page)).toEqual([9]); // same publisher, same day
  expect(actionViews(action('Stifel', '2026-10-05', 1232), views)).toEqual([]);
});

it('keeps dated views inside the chart window, newest first', () => {
  const views = [view(1, '2026-09-01'), view(2, '2026-10-21'), view(3, null), view(4, '2026-10-02')];
  expect(viewsInWindow(views, { start: '2026-10-01', end: '2026-10-23' }).map((v) => v.page)).toEqual([2, 4]);
  expect(viewsInWindow(views, null).map((v) => v.page)).toEqual([2, 4, 1]);
});

it('draws a views lane, and clicking a broker dot shows its reasoning and linked report claims', () => {
  document.body.innerHTML = '<div id="targets-test"></div>';
  const linked = [...actions.filter((a) => a.firm !== 'Jefferies'), { ...action('Jefferies', '2026-10-21', 1250, 1200), reportId: REPORT, thesis: '800G orders visible into 1H27' }];
  const closes = [{ date: '2026-10-05', close: 650 }, { date: '2026-10-21', close: 740 }];
  renderPriceTargetChart('targets-test', { actions: linked, consensus: [], closes, currency: 'USD', zh: true, views: [view(3, '2026-10-21'), view(5, '2026-10-15', 'headwind')] });
  expect(document.querySelectorAll('[data-target-view]')).toHaveLength(2);
  expect(document.querySelector('[data-target-view="2026-10-15"]')!.getAttribute('class')).toContain('market-target-view--headwind');
  const dot = document.querySelector('[data-target-dot="Jefferies"]')!;
  dot.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const detail = document.querySelector('.market-target-detail')!.textContent!;
  expect(detail).toContain('Jefferies');
  expect(detail).toContain('800G orders visible into 1H27');
  expect(detail).toContain('claim p3');
  expect(detail).toContain('Optical networking');
  expect(document.querySelector('.market-target-views')!.textContent).toContain('claim p5'); // all views listed below the table
});
