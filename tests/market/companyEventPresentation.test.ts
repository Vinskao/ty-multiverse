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
