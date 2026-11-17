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
