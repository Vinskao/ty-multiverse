import { describe, expect, it } from 'vitest';
import { conferenceOtherScheduleCounts, companyEventSourceUrl } from '../../src/scripts/market/companyEventPresentation';

describe('company event presentation', () => {
  it('counts other conference schedules for the same company without collapsing rows', () => {
    const events = [
      { code: '3017', type: 'investor_conference' },
      { code: '3017', type: 'investor_conference' },
      { code: '3324', type: 'investor_conference' },
      { code: '3017', type: 'monthly_revenue' },
    ];

    expect(conferenceOtherScheduleCounts(events)).toEqual(new Map([['3017', 1]]));
    expect(events).toHaveLength(4);
  });

  it('prefers the specific event source and falls back to the official calendar for conferences', () => {
    expect(companyEventSourceUrl({ type: 'investor_conference', sourceUrl: 'https://mopsov.twse.com.tw/nas/STR/report.pdf' }))
      .toBe('https://mopsov.twse.com.tw/nas/STR/report.pdf');
    expect(companyEventSourceUrl({ type: 'investor_conference' }))
      .toBe('https://irplatform.tdcc.com.tw/ir/event/list?lang=zh');
    expect(companyEventSourceUrl({ type: 'monthly_revenue' })).toBeUndefined();
  });
});

// 2026-11-17: a stock with an open insider sale filing (內部人持股轉讓事前申報) is marked on its row and in its detail header.
describe('insider sale notice', () => {
  const sale = { code: '1734', type: 'insider_transfer', status: 'active', period: '法人董事代表人本人 郭修吉 預定轉讓 173,000 股（盤後定價交易），11/19–12/18' };

  it('says the insiders are selling now, with the filing as the tooltip', async () => {
    const { insiderSaleNotice } = await import('../../src/scripts/market/companyEventPresentation');
    expect(insiderSaleNotice([sale], true)).toEqual({ text: '內部人申報賣股中', title: sale.period });
    expect(insiderSaleNotice([sale], false)?.text).toBe('Insider sale filed');
  });

  it('says a sale is about to start when the window has not opened yet', async () => {
    const { insiderSaleNotice } = await import('../../src/scripts/market/companyEventPresentation');
    expect(insiderSaleNotice([{ ...sale, status: 'upcoming' }], true)?.text).toBe('內部人即將賣股');
  });

  it('shows nothing without an insider filing', async () => {
    const { insiderSaleNotice } = await import('../../src/scripts/market/companyEventPresentation');
    expect(insiderSaleNotice([{ code: '1734', type: 'monthly_revenue' }], true)).toBeNull();
  });
});

describe('insider notices (sell, unsold, buy)', () => {
  const sale = { code: '1734', type: 'insider_transfer', status: 'active', period: 'p-sale' };
  const unsold = { code: '2313', type: 'insider_untransferred', status: 'recent', period: 'p-unsold' };
  const buy = { code: '1101', type: 'insider_buy', status: 'recent', period: 'p-buy' };

  it('marks a buy, an unsold filing and a sale with their own tone', async () => {
    const { stockNotices } = await import('../../src/scripts/market/companyEventPresentation');
    expect(stockNotices([buy], true)).toEqual([{ text: '內部人增持', title: 'p-buy', tone: 'buy' }]);
    expect(stockNotices([unsold], true)).toEqual([{ text: '內部人申報未賣出', title: 'p-unsold', tone: 'neutral' }]);
    expect(stockNotices([sale, buy], false).map((notice) => notice.tone)).toEqual(['sell', 'buy']);
  });

  it('ignores ordinary company events', async () => {
    const { stockNotices } = await import('../../src/scripts/market/companyEventPresentation');
    expect(stockNotices([{ code: '1101', type: 'monthly_revenue' }], true)).toEqual([]);
  });
});

// 2026-11-17: a stock whose volume reached the yearly top 10 / top 5 this week is marked on its rows (it was Telegram-only before).
describe('volume spike notice', () => {
  const top5 = { code: '6857', type: 'volume_spike', flag: 'top5', period: '本週成交量進入近一年前 10 大：週一第 2 名（前 5）' };
  const top10 = { code: '2330', type: 'volume_spike', flag: 'top10', period: 'p10' };

  it('calls a top-5 day a volume spike and a top-10 day heavy volume, with the ranking as the tooltip', async () => {
    const { stockNotices } = await import('../../src/scripts/market/companyEventPresentation');
    expect(stockNotices([top5], true)).toEqual([{ text: '爆大量 · 年度前 5', title: top5.period, tone: 'volume' }]);
    expect(stockNotices([top10], true)[0]).toMatchObject({ text: '大量 · 年度前 10', tone: 'volume' });
    expect(stockNotices([top5], false)[0].text).toBe('Volume spike · top 5 of the year');
  });

  it('lists the volume mark before the insider marks', async () => {
    const { stockNotices } = await import('../../src/scripts/market/companyEventPresentation');
    const sale = { code: '6857', type: 'insider_transfer', status: 'active', period: 'p' };
    expect(stockNotices([sale, top5], true).map((notice) => notice.tone)).toEqual(['volume', 'sell']);
  });
});

describe('one badge per mark', () => {
  it('knows which event types already have their own stock badge', async () => {
    const { hasStockNotice } = await import('../../src/scripts/market/companyEventPresentation');
    for (const type of ['volume_spike', 'insider_transfer', 'insider_untransferred', 'insider_buy']) expect(hasStockNotice(type), type).toBe(true);
    for (const type of ['monthly_revenue', 'financial_report', 'investor_conference']) expect(hasStockNotice(type), type).toBe(false);
  });
});

describe('marketEventKey', () => {
  it('keeps Taiwan codes as they are and separates a Japanese stock with the same digits', async () => {
    const { marketEventKey } = await import('../../src/scripts/market/companyEventPresentation');
    expect(marketEventKey('6857')).toBe('6857');
    expect(marketEventKey('6857', 'TW')).toBe('6857');
    expect(marketEventKey('6857', 'JP')).toBe('JP:6857');
    expect(marketEventKey('6857', 'JP')).not.toBe(marketEventKey('6857', 'TW'));
  });
});
