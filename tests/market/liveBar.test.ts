import { expect, it } from 'vitest';
import { withLiveBar } from '../../src/scripts/market/liveBar';

// 2026-11-18: the official daily price lands after the close (and the collector runs later still), so the chart ended a day
// behind. A quote stamped today becomes today's bar until the official row arrives.
const NOW = new Date('2026-11-18T15:20:00+08:00');
const bar = (date: string, close: number) => ({ date, code: '3443', name: '創意', sources: { 'twse:daily-price': { open: close, high: close, low: close, close, volume_shares: 1000 } } });
const quote = { symbol: '3443', close: 6940, open: 7000, high: 7100, low: 6500, change: -40, changePercent: -0.5, volume: 1, volumeShares: 1_500_000, timestamp: '2026-11-18T13:30:00+08:00' };

it("adds today's bar from a quote stamped today when the history ends yesterday", () => {
  const points = withLiveBar([bar('2026-11-16', 7750), bar('2026-11-17', 6980)], quote, 'stock', NOW);
  expect(points).toHaveLength(3);
  expect(points[2]).toMatchObject({ date: '2026-11-18', code: '3443', name: '創意' });
  expect(points[2].sources['twse:daily-price']).toEqual({ open: 7000, high: 7100, low: 6500, close: 6940, volume_shares: 1_500_000 });
});

it('does not change the list it was given, and leaves the official row alone once it exists', () => {
  const history = [bar('2026-11-17', 6980)];
  withLiveBar(history, quote, 'stock', NOW);
  expect(history).toHaveLength(1);
  const official = [bar('2026-11-17', 6980), bar('2026-11-18', 6950)];
  expect(withLiveBar(official, quote, 'stock', NOW)).toEqual(official);
});

it('ignores a quote from an earlier day, an empty quote, futures and an empty history', () => {
  const history = [bar('2026-11-17', 6980)];
  expect(withLiveBar(history, { ...quote, timestamp: '2026-11-17T13:30:00+08:00' }, 'stock', NOW)).toEqual(history);
  expect(withLiveBar(history, { ...quote, close: 0 }, 'stock', NOW)).toEqual(history);
  expect(withLiveBar(history, null, 'stock', NOW)).toEqual(history);
  expect(withLiveBar(history, quote, 'futures', NOW)).toEqual(history);
  expect(withLiveBar([], quote, 'stock', NOW)).toEqual([]);
});

it('uses Taipei time for "today", whatever time zone the browser is in', () => {
  const lateNight = new Date('2026-11-18T23:30:00+08:00');   // already the 19th in no zone, but the 18th in Taipei
  expect(withLiveBar([bar('2026-11-17', 6980)], quote, 'stock', lateNight)[1].date).toBe('2026-11-18');
});

it('leaves volume at zero rather than guessing lots versus shares when the quote has no share count', () => {
  const noShares = { ...quote, volumeShares: undefined };
  const point = withLiveBar([bar('2026-11-17', 6980)], noShares, 'stock', NOW)[1];
  expect(point.sources['twse:daily-price'].volume_shares).toBe(0);
});
