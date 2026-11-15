import { describe, expect, it } from 'vitest';
import { cellLabel, headline, manualResults, platformLine, type VisibilityView } from '../../src/scripts/palais/aiVisibility';

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

describe('manual entry for Grok / Gemini / Claude', () => {
  it('turns the form into results and skips cells left unchecked', () => {
    expect(manualResults([
      { keyword: 'k', platform: 'grok', outcome: 'appeared', rank: '2', cited: true },
      { keyword: 'k', platform: 'gemini', outcome: 'absent', rank: '', cited: false },
      { keyword: 'k', platform: 'claude', outcome: 'unavailable', rank: '', cited: false },
      { keyword: 'j', platform: 'grok', outcome: '', rank: '', cited: false },
    ])).toEqual([
      { keyword: 'k', platform: 'grok', status: 'checked', appeared: true, rank: 2, cited: true, snippet: '', competitors: [] },
      { keyword: 'k', platform: 'gemini', status: 'checked', appeared: false, rank: null, cited: false, snippet: '', competitors: [] },
      { keyword: 'k', platform: 'claude', status: 'unavailable', appeared: false, rank: null, cited: false, snippet: '', competitors: [] },
    ]);
  });

  it('drops a rank outside 1-20 instead of sending it', () => {
    expect(manualResults([{ keyword: 'k', platform: 'grok', outcome: 'appeared', rank: '50', cited: false }])[0].rank).toBeNull();
  });
});
