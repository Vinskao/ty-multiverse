import { describe, expect, it } from 'vitest';
import { holdingFilters, filterForReportTag, reportTagForFilter } from '../../src/scripts/market/holdingsFilter';

const rows = [
  { key: 'ai-server', label: 'AI 伺服器', tagIds: ['ai', 'server'] },
  { key: 'ai-server', label: 'AI 伺服器', tagIds: ['ai', 'server'] },
  { key: 'unclassified', label: '未分類', tagIds: [] },
];

describe('holdings industry filters shared with the report list', () => {
  it('counts holdings per industry in first-seen order', () => {
    expect(holdingFilters(rows).map(({ key, count }) => [key, count])).toEqual([['ai-server', 2], ['unclassified', 1]]);
  });
  it('maps a picked industry to the report category to select, if any', () => {
    const filters = holdingFilters(rows);
    expect(reportTagForFilter(filters[0])).toBe('ai');
    expect(reportTagForFilter(filters[1])).toBeUndefined();
  });
  it('maps a picked report category back to the holdings industry', () => {
    const filters = holdingFilters(rows);
    expect(filterForReportTag(filters, 'server')?.key).toBe('ai-server');
    expect(filterForReportTag(filters, 'nope')).toBeUndefined();
  });
});
