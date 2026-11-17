import { expect, it } from 'vitest';
import { heatPollInterval, pickHeat, type HeatStatus } from '../../src/scripts/market/marketHeat';

it('refreshes every minute while an event is showing and only every few minutes on a quiet day', () => {
  expect(heatPollInterval(true)).toBe(60_000);
  expect(heatPollInterval(false)).toBe(300_000);
});

const status: HeatStatus = {
  asOf: '2026-11-17', final: true,
  items: [
    { id: 'sox', level: 'alert', dir: 'down', group: 'us', href: '/stocks/', zh: '費城半導體指數大跌 5.28%', en: 'SOX fell 5.28%' },
    { id: 'move', level: 'warn', dir: 'down', group: 'tw', href: '/stocks/', zh: '加權指數日盤收盤大跌 2.31%', en: 'TAIEX day session fell 2.31%' },
    { id: 'night', level: 'info', dir: 'up', group: 'tw', href: '/stocks/', zh: '台指期夜盤 +0.63%', en: 'Night session +0.63%' },
    { id: 'pe', level: 'warn', dir: 'down', group: 'tw', href: '/macro/#macro-leverage', zh: '大盤本益比連降 3 日', en: 'Market P/E down 3 sessions' },
    { id: 'vix', level: 'warn', dir: 'down', group: 'us', href: '/macro/#macro-volatility', zh: 'VIX 27.0，連漲 4 日', en: 'VIX 27.0, up 4 sessions' },
  ],
};

it('has one row for Taiwan and one for the U.S., Taiwan first, each holding its own items in order', () => {
  const heat = pickHeat(status, 'zh')!;
  expect(heat.rows.map((row) => [row.group, row.label])).toEqual([['tw', '台股'], ['us', '美股']]);
  expect(heat.rows[0].parts.map((part) => part.text)).toEqual(['加權指數日盤收盤大跌 2.31%', '台指期夜盤 +0.63%', '大盤本益比連降 3 日']);
  expect(heat.rows[1].parts.map((part) => part.text)).toEqual(['費城半導體指數大跌 5.28%', 'VIX 27.0，連漲 4 日']);
  expect(heat.rows[1].parts[1].href).toBe('/macro/#macro-volatility');
});

it('styles the whole bar by the most severe item, the first one the server sends', () => {
  const heat = pickHeat(status, 'zh')!;
  expect(heat.level).toBe('alert');
  expect(heat.dir).toBe('down');
  expect(heat.icon).toBe('🔥');
});

it('drops a row that has nothing to say and follows the site language', () => {
  const onlyUs: HeatStatus = { asOf: '2026-11-17', items: [status.items![0]] };
  const heat = pickHeat(onlyUs, 'en')!;
  expect(heat.rows).toHaveLength(1);
  expect(heat.rows[0]).toMatchObject({ group: 'us', label: 'US' });
  expect(heat.rows[0].parts[0].text).toBe('SOX fell 5.28%');
  expect(heat.footnote).toBe('2026-11-17 close · TWSE / TAIFEX / Yahoo');
});

it('an item without a group is a Taiwan item', () => {
  const heat = pickHeat({ asOf: '2026-11-17', items: [{ id: 'move', level: 'warn', zh: 'a', en: 'a' }] }, 'zh')!;
  expect(heat.rows.map((row) => row.group)).toEqual(['tw']);
});

it('says live while the market is trading and uses a rocket for a big rise', () => {
  const rise: HeatStatus = { asOf: '2026-11-17', final: false, items: [{ id: 'move', level: 'warn', dir: 'up', group: 'tw', zh: '盤中加權指數大漲 2.50%', en: 'x' }] };
  const heat = pickHeat(rise, 'zh')!;
  expect(heat.footnote).toBe('2026-11-17 盤中即時 · 證交所／期交所／Yahoo');
  expect(heat.icon).toBe('🚀');
});

it('shows nothing when the server has nothing to say about today', () => {
  expect(pickHeat({ items: [], asOf: null }, 'zh')).toBeNull();
  expect(pickHeat(null, 'zh')).toBeNull();
  expect(pickHeat({ items: [{ id: 'move', level: 'warn', zh: 'x', en: 'x' }], asOf: null }, 'zh')).toBeNull();
});

it('a different state gets a different dismiss key, so closing one warning does not hide a worse one', () => {
  const worse: HeatStatus = { ...status, items: [{ ...status.items![0], level: 'warn' }, ...status.items!.slice(1)] };
  expect(pickHeat(status, 'zh')!.key).not.toBe(pickHeat(worse, 'zh')!.key);
  expect(pickHeat(status, 'zh')!.key).toBe(pickHeat(status, 'en')!.key);
});

it('links only same-site paths, whatever the server sends', () => {
  const odd: HeatStatus = { asOf: '2026-11-17', items: [
    { id: 'move', level: 'warn', dir: 'down', group: 'tw', href: 'https://evil.example/x', zh: 'a', en: 'a' },
    { id: 'pe', level: 'info', dir: 'down', group: 'tw', href: '//evil.example/x', zh: 'b', en: 'b' },
    { id: 'vix', level: 'info', dir: 'down', group: 'us', href: 'javascript:alert(1)', zh: 'c', en: 'c' }] };
  const heat = pickHeat(odd, 'zh')!;
  expect(heat.rows.flatMap((row) => row.parts.map((part) => part.href))).toEqual([null, null, null]);
});
