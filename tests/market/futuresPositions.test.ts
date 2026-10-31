import { describe, expect, it } from 'vitest';
import { foreignPositionSummary, OPEN_INTEREST_FIELDS } from '../../src/scripts/market/futuresPositions';

// Trimmed from GET /api/market/dashboard/history/TXF on 2026-10-19 (taifex:futures-institutional).
const point = (date: string, foreign: number | null, trust = 0, dealer = 0) => ({
  date,
  sources: { 'taifex:futures-institutional': {
    foreign_net_trade_contracts: 1000, foreign_net_open_interest: foreign,
    trust_net_open_interest: trust, dealer_net_open_interest: dealer,
  } },
});
const points = [point('2026-10-15', -97582), point('2026-10-16', -93675), point('2026-10-19', -91145)];

describe('TXF participant open interest', () => {
  it('reads net open interest, not net trading, for each participant', () => {
    expect(OPEN_INTEREST_FIELDS).toEqual(['foreign_net_open_interest', 'trust_net_open_interest', 'dealer_net_open_interest']);
  });

  it('states the latest foreign net short and how it changed from the previous trading day', () => {
    expect(foreignPositionSummary(points, 'zh')).toBe('外資台指期淨空單 91,145 口（10/19），較前一交易日減少 2,530 口');
    expect(foreignPositionSummary(points, 'en')).toBe('Foreign TAIEX futures net short 91,145 contracts (10/19), down 2,530 from the previous trading day');
  });

  it('describes a growing short and a net long position', () => {
    expect(foreignPositionSummary(points.slice(0, 2).reverse(), 'zh')).toBe('外資台指期淨空單 97,582 口（10/15），較前一交易日增加 3,907 口');
    expect(foreignPositionSummary([point('2026-10-18', -500), point('2026-10-19', 1200)], 'zh')).toBe('外資台指期淨多單 1,200 口（10/19），前一交易日為淨空單 500 口');
  });

  it('skips days without the field and returns null when there is nothing to report', () => {
    expect(foreignPositionSummary([...points, point('2026-10-20', null)], 'zh')).toBe('外資台指期淨空單 91,145 口（10/19），較前一交易日減少 2,530 口');
    expect(foreignPositionSummary([point('2026-10-19', -91145)], 'zh')).toBe('外資台指期淨空單 91,145 口（10/19）');
    expect(foreignPositionSummary([], 'zh')).toBeNull();
  });
});
