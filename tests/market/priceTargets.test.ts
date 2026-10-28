import { beforeEach, describe, expect, it } from 'vitest';
import { firmColors, historyCloses, latestTargets, type TargetAction } from '../../src/scripts/market/priceTargets';
import { renderTargetDetails } from '../../src/scripts/market/targetDetails';

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

beforeEach(() => { document.body.innerHTML = '<div id="targets-test"></div>'; });
const closes = [{ date: '2026-10-05', close: 650 }, { date: '2026-10-21', close: 740 }];
it('lists each broker with its change and upside, and says when there is no per-broker data', () => {
  renderTargetDetails('targets-test', { actions, closes, currency: 'USD', zh: true });
  expect(document.querySelector('table')!.textContent).toContain('Jefferies');
  expect(document.querySelectorAll('.market-target-row')).toHaveLength(5);
  renderTargetDetails('targets-test', { actions: [], closes, currency: 'TWD', zh: true });
  expect(document.body.textContent).toContain('沒有個別券商');
  expect(document.querySelector('.market-target-views')).not.toBeNull();
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

it('clicking a broker row shows its reasoning and linked report claims, and every view is listed below', () => {
  const linked = [...actions.filter((a) => a.firm !== 'Jefferies'), { ...action('Jefferies', '2026-10-21', 1250, 1200), reportId: REPORT, thesis: '800G orders visible into 1H27' }];
  renderTargetDetails('targets-test', { actions: linked, closes, currency: 'USD', zh: true, views: [view(3, '2026-10-21'), view(5, '2026-10-15', 'headwind')] });
  const row = [...document.querySelectorAll('.market-target-row')].find(tr => tr.textContent!.includes('Jefferies'))!;
  row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const detail = document.querySelector('.market-target-detail')!.textContent!;
  expect(detail).toContain('Jefferies');
  expect(detail).toContain('800G orders visible into 1H27');
  expect(detail).toContain('claim p3');
  expect(detail).toContain('Optical networking');
  expect(document.querySelector('.market-target-views')!.textContent).toContain('claim p5');
});

it('says when a view is dated by the day it was recorded or by its data cut-off instead of a publication date', () => {
  renderTargetDetails('targets-test', { actions: [], closes, currency: 'TWD', zh: true,
    views: [{ ...view(3, '2026-10-20'), dateKind: 'recorded' }, { ...view(5, '2026-10-21'), dateKind: 'data' }, view(7, '2026-10-21')] });
  const list = document.querySelector('.market-target-views')!.textContent!;
  expect(list).toContain('2026-10-20（入庫日）');
  expect(list).toContain('2026-10-21（資料截點）');
  expect(list.match(/2026-10-21 ·/g)).toHaveLength(1); // the published one has no suffix
});

it('links a view back to the post it came from, so the source is named and one click away', () => {
  renderTargetDetails('targets-test', { actions: [], closes: [{ date: '2026-10-20', close: 100 }], currency: 'USD', zh: true,
    views: [{ ...view(1, '2026-10-20', 'tailwind', 'IEObserve 國際經濟觀察'), sourceUrl: 'https://t.me/ieobserve/2312' }] });
  const link = document.querySelector<HTMLAnchorElement>('.market-target-views a')!;
  expect(link.href).toBe('https://t.me/ieobserve/2312');
  expect(link.textContent).toBe('原文 ↗');
  expect(document.querySelector('.market-target-views')!.textContent).toContain('IEObserve 國際經濟觀察');
});

import { brokerTargetLines } from '../../src/scripts/market/priceTargets';

describe('broker target lines on the price chart', () => {
  const row = (firm: string, date: string, target: number | null): TargetAction => ({ firm, date, action: null, rating: null, previousRating: null,
    target, previousTarget: null, currency: 'TWD', source: 'ai-routine', sourceUrl: 'https://example.com' });
  const dates = ['2026-09-01', '2026-09-15', '2026-10-01', '2026-10-20'];

  it('gives each broker its own step line that holds until that broker changes its target', () => {
    const lines = brokerTargetLines([row('高盛', '2026-09-10', 3000), row('高盛', '2026-10-15', 3400), row('美銀', '2026-10-01', 2800)], dates);
    expect(lines.map(line => line.firm).sort()).toEqual(['美銀', '高盛']);
    expect(lines.find(line => line.firm === '高盛')!.values).toEqual([null, 3000, 3000, 3400]);
    expect(lines.find(line => line.firm === '美銀')!.values).toEqual([null, null, 2800, 2800]);
  });

  it('ignores rating-only notes, keeps same-day last write and drops a target a year after it was made', () => {
    const lines = brokerTargetLines([row('高盛', '2026-09-10', null), row('美銀', '2025-08-01', 2000), row('美銀', '2025-08-01', 2100), row('元大', '2026-09-10', 0)], ['2025-09-01', '2026-09-15']);
    expect(lines).toEqual([expect.objectContaining({ firm: '美銀', values: [2100, null] })]);
  });

  it('orders brokers by how many targets they published, then by name', () => {
    const lines = brokerTargetLines([row('甲', '2026-09-10', 1), row('乙', '2026-09-10', 2), row('乙', '2026-10-01', 3), row('丙', '2026-09-10', 4)], dates);
    expect(lines.map(line => line.firm)).toEqual(['乙', '丙', '甲']);
    expect(brokerTargetLines([], dates)).toEqual([]);
  });
});
