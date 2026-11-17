import { expect, it } from 'vitest';
import { pickHeat, type HeatStatus } from '../../src/scripts/market/marketHeat';

const status: HeatStatus = {
  asOf: '2026-11-17', final: true,
  items: [
    { id: 'move', level: 'alert', dir: 'down', href: '/stocks/', zh: '加權指數今日大跌 4.00%，大跌伴隨爆量', en: 'TAIEX fell 4.00% today on heavy volume' },
    { id: 'pe', level: 'warn', dir: 'down', href: '/macro/#macro-leverage', zh: '大盤本益比連降 3 日，降速加快', en: 'Market P/E down 3 sessions, falling faster' },
  ],
};

it('leads with the most severe item and lists the rest as details', () => {
  const heat = pickHeat(status, 'zh')!;
  expect(heat.headline).toContain('爆量');
  expect(heat.details).toEqual([{ text: '大盤本益比連降 3 日，降速加快', href: '/macro/#macro-leverage' }]);
  expect(heat.href).toBe('/stocks/');
  expect(heat.level).toBe('alert');
  expect(heat.icon).toBe('🔥');
});

it('follows the site language', () => {
  const heat = pickHeat(status, 'en')!;
  expect(heat.headline).toBe('TAIEX fell 4.00% today on heavy volume');
  expect(heat.footnote).toBe('2026-11-17 close · TWSE / TAIFEX / Yahoo');
});

it('says live while the market is trading and uses a rocket for a big rise', () => {
  const rise: HeatStatus = { asOf: '2026-11-17', final: false, items: [{ id: 'move', level: 'warn', dir: 'up', zh: '盤中加權指數今日大漲 2.50%', en: 'TAIEX intraday: rose 2.50%' }] };
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
    { id: 'move', level: 'warn', dir: 'down', href: 'https://evil.example/x', zh: 'a', en: 'a' },
    { id: 'pe', level: 'info', dir: 'down', href: '//evil.example/x', zh: 'b', en: 'b' },
    { id: 'vix', level: 'info', dir: 'down', href: 'javascript:alert(1)', zh: 'c', en: 'c' }] };
  const heat = pickHeat(odd, 'zh')!;
  expect(heat.href).toBeNull();
  expect(heat.details.map((detail) => detail.href)).toEqual([null, null]);
});
