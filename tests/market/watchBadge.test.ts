import { describe, expect, it } from 'vitest';
import { watchBadge } from '../../src/scripts/market/watchBadge';

const item = { source: 'ai-watch', reason: 'CoWoS 產能 2027 年再擴', reports: 2, expiresAt: '2026-11-27T00:00:00+00:00' };

describe('AI watch badge in the custom area', () => {
  it('marks a stock the analyst added, with why, how many reports back it and when it would leave', () => {
    expect(watchBadge(item, true)).toEqual({
      text: 'AI 觀察 · 到期 11/27',
      title: 'CoWoS 產能 2027 年再擴（2 份報告支持；11/27 前沒有新報告提到就會移出）',
    });
    expect(watchBadge(item, false)!.text).toBe('AI watch · until 11/27');
  });
  it('shows nothing for the owner’s own picks or holdings', () => {
    expect(watchBadge({ source: undefined }, true)).toBeNull();
    expect(watchBadge({}, true)).toBeNull();
  });
  it('still marks a row whose expiry is unknown', () => {
    expect(watchBadge({ source: 'ai-watch', reason: '理由', reports: 1 }, true)).toEqual({ text: 'AI 觀察', title: '理由（1 份報告支持）' });
  });
});
