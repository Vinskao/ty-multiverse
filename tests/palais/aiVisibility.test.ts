import { describe, expect, it } from 'vitest';
import { AUTO_PLATFORMS, cellLabel, headline, platformLine, type VisibilityView } from '../../src/scripts/palais/aiVisibility';

const view = (over: Partial<VisibilityView> = {}): VisibilityView => ({
  latest: { id: 'a', at: '2026-11-17T19:00:00+00:00', checked: 8, appeared: 2, unavailable: 4, bestRank: 3 },
  previous: { id: 'b', at: '2026-11-14T19:00:00+00:00', checked: 8, appeared: 1, unavailable: 4, bestRank: 5 },
  byPlatform: { chatgpt: { checked: 8, appeared: 2, bestRank: 3 } }, cells: [], trend: [], pending: 0, fixes: [], ...over,
});

describe('AI visibility dashboard text', () => {
  it('says when there is no accepted run yet, and how many wait for review', () => {
    expect(headline(view({ latest: null, previous: null }))).toBe('尚無已審核的檢視結果');
    expect(headline(view({ latest: null, previous: null, pending: 2 }))).toBe('尚無已審核的檢視結果（2 份待審）');
  });

  it('shows appearances out of checked cells and the change against the previous run', () => {
    expect(headline(view())).toBe('出現 2/8 格（上次 1/8） · 最佳名次 #3 · 4 格無法檢視');
  });

  it('does not invent a rate when nothing could be checked', () => {
    const none = { id: 'a', at: '', checked: 0, appeared: 0, unavailable: 12, bestRank: null };
    expect(headline(view({ latest: none, previous: null }))).toBe('出現 0/0 格 · 12 格無法檢視');
  });

  it('labels cells by outcome', () => {
    const base = { keyword: 'k', platform: 'grok', status: 'checked', appeared: false, rank: null, cited: false, snippet: '', competitors: [] };
    expect(cellLabel({ ...base, change: 'none' })).toBe('未出現');
    expect(cellLabel({ ...base, appeared: true, rank: 2, change: 'up' })).toBe('#2 ▲');
    expect(cellLabel({ ...base, appeared: true, rank: null, change: 'new' })).toBe('出現 新');
    expect(cellLabel({ ...base, status: 'unavailable', change: 'unavailable' })).toBe('無法檢視');
  });

  it('formats one platform', () => {
    expect(platformLine('chatgpt', { checked: 8, appeared: 2, bestRank: 3 })).toBe('ChatGPT 2/8 · #3');
    expect(platformLine('gemini', undefined)).toBe('Gemini 無法檢視');
  });
});

describe('fully automatic checks (2026-11-15)', () => {
  it('only Gemini and Claude are checked automatically', () => {
    expect(AUTO_PLATFORMS).toEqual(['gemini', 'claude']);
  });

  it('shows ChatGPT and Grok as paused rather than unavailable', () => {
    expect(platformLine('chatgpt', undefined)).toBe('ChatGPT 暫停（需 API 額度）');
    expect(platformLine('gemini', undefined)).toBe('Gemini 無法檢視');
  });
});

// 2026-11-16: social follower / reach numbers shown under the AI visibility table.
import { socialChange, socialTrend, type SocialItem } from '../../src/scripts/palais/aiVisibility';

describe('social numbers', () => {
  const item = (over: Partial<SocialItem>): SocialItem => ({ platform: 'instagram', metric: 'followers', label: 'Instagram 追蹤', value: 13,
    asOf: '2026-11-16', weekChange: 3, comparedWith: '2026-11-09', sinceFirst: 3, firstDay: '2026-11-09', ...over });

  it('shows the weekly change with the day it is compared with', () => {
    expect(socialChange(item({}))).toBe('+3（較 11/09）');
    expect(socialChange(item({ weekChange: -2 }))).toBe('-2（較 11/09）');
    expect(socialChange(item({ weekChange: 0 }))).toBe('持平（較 11/09）');
  });

  it('never shows a zero change before a week of history exists', () => {
    expect(socialChange(item({ weekChange: null, comparedWith: null, sinceFirst: null, firstDay: '2026-11-16' }))).toBe('自 11/16 起記錄，滿一週後顯示變化');
    expect(socialChange(item({ weekChange: null, comparedWith: null, sinceFirst: 1, firstDay: '2026-11-14' }))).toBe('+1（自 11/14，未滿一週）');
  });

  it('marks the direction for colouring', () => {
    expect([socialTrend(item({})), socialTrend(item({ weekChange: -1 })), socialTrend(item({ weekChange: 0 }))]).toEqual(['up', 'down', 'flat']);
  });
});
