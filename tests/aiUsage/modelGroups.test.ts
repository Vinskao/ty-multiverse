import { describe, expect, it } from 'vitest';
import { groupUsage, parseModel, type UsageRow } from '../../src/scripts/aiUsage/modelGroups';

const row = (aiProvider: string, modelName: string, totalTokens: number, cost = 1, calls = 1): UsageRow => ({
  aiProvider,
  modelName,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCacheCreationInputTokens: 0,
  totalCacheReadInputTokens: 0,
  totalTokens,
  totalEstimatedCostUsd: cost,
  callCount: calls,
});

describe('parseModel (generation + minor version)', () => {
  it('splits Claude names into generation and tier+version', () => {
    expect(parseModel('claude-opus-5-5')).toEqual({ generation: 'Claude 5', version: 'Opus 5.5' });
    expect(parseModel('claude-sonnet-4-6')).toEqual({ generation: 'Claude 4', version: 'Sonnet 4.6' });
    expect(parseModel('claude-opus-4-8')).toEqual({ generation: 'Claude 4', version: 'Opus 4.8' });
    expect(parseModel('claude-haiku-5-5')).toEqual({ generation: 'Claude 5', version: 'Haiku 5.5' });
  });

  it('handles a Claude name with no minor version', () => {
    expect(parseModel('claude-opus-5')).toEqual({ generation: 'Claude 5', version: 'Opus 5' });
  });

  it('drops the date snapshot and the [1m] context suffix so they merge with the plain name', () => {
    expect(parseModel('claude-haiku-4-5-20251001')).toEqual(parseModel('claude-haiku-4-5'));
    expect(parseModel('claude-haiku-4-5-20251001')).toEqual({ generation: 'Claude 4', version: 'Haiku 4.5' });
    expect(parseModel('claude-opus-5-5[1m]')).toEqual(parseModel('claude-opus-5-5'));
    expect(parseModel('claude-sonnet-5-5-20261001')).toEqual({ generation: 'Claude 5', version: 'Sonnet 5.5' });
  });

  it('handles the older Claude 3.x naming (version before tier)', () => {
    expect(parseModel('claude-3-5-sonnet-20241022')).toEqual({ generation: 'Claude 3', version: 'Sonnet 3.5' });
  });

  it('splits Codex / GPT names', () => {
    expect(parseModel('gpt-6.1-terra')).toEqual({ generation: 'GPT-6', version: '6.1 Terra' });
    expect(parseModel('gpt-6-luna')).toEqual({ generation: 'GPT-6', version: '6 Luna' });
    expect(parseModel('gpt-6.1-sol')).toEqual({ generation: 'GPT-6', version: '6.1 Sol' });
    expect(parseModel('gpt-4.1-nano')).toEqual({ generation: 'GPT-4', version: '4.1 Nano' });
    expect(parseModel('gpt-4o-mini')).toEqual({ generation: 'GPT-4', version: '4o Mini' });
    expect(parseModel('gpt-3.5-turbo')).toEqual({ generation: 'GPT-3', version: '3.5 Turbo' });
  });

  it('splits Gemini names', () => {
    expect(parseModel('gemini-1.5-flash')).toEqual({ generation: 'Gemini 1', version: '1.5 Flash' });
    expect(parseModel('gemini-2.5-pro')).toEqual({ generation: 'Gemini 2', version: '2.5 Pro' });
  });

  it('is case-insensitive and keeps unknown names visible instead of dropping them', () => {
    expect(parseModel('GPT-4o')).toEqual({ generation: 'GPT-4', version: '4o' });
    expect(parseModel('<synthetic>')).toEqual({ generation: 'Other', version: '<synthetic>' });
    expect(parseModel('mystery-model')).toEqual({ generation: 'Other', version: 'mystery-model' });
    expect(parseModel('')).toEqual({ generation: 'Other', version: 'Unknown' });
  });
});

describe('groupUsage (vendor > generation > version)', () => {
  const rows = [
    row('claude-code', 'claude-opus-5-5', 100, 10, 2),
    row('claude-code', 'claude-opus-5-5[1m]', 50, 5, 1),
    row('claude', 'claude-sonnet-5-5', 200, 4, 3),
    row('claude-code', 'claude-opus-4-8', 30, 3, 1),
    row('claude-code', 'claude-haiku-4-5-20251001', 10, 1, 1),
    row('codex', 'gpt-6.1-terra', 500, 7, 5),
    row('codex', 'gpt-6-luna', 400, 6, 4),
  ];
  const tree = groupUsage(rows);

  it('merges claude and claude-code into one vendor and keeps codex separate', () => {
    expect(tree.map((v) => v.vendor).sort()).toEqual(['claude', 'codex']);
  });

  it('rolls totals up through every level', () => {
    const claude = tree.find((v) => v.vendor === 'claude')!;
    expect(claude.totalTokens).toBe(100 + 50 + 200 + 30 + 10);
    expect(claude.totalCost).toBeCloseTo(10 + 5 + 4 + 3 + 1);
    expect(claude.calls).toBe(2 + 1 + 3 + 1 + 1);

    const gen5 = claude.generations.find((g) => g.generation === 'Claude 5')!;
    expect(gen5.totalTokens).toBe(350);
    const opus55 = gen5.versions.find((v) => v.version === 'Opus 5.5')!;
    expect(opus55.totalTokens).toBe(150); // plain + [1m] merged
    expect(opus55.calls).toBe(3);
  });

  it('puts the newest generation first and the busiest version first', () => {
    const claude = tree.find((v) => v.vendor === 'claude')!;
    expect(claude.generations.map((g) => g.generation)).toEqual(['Claude 5', 'Claude 4']);
    expect(claude.generations[0].versions.map((v) => v.version)).toEqual(['Sonnet 5.5', 'Opus 5.5']);
  });

  it('sorts vendors by total tokens, busiest first', () => {
    expect(tree[0].vendor).toBe('codex');
  });

  it('uses the model name to place a row whose provider is unknown', () => {
    const t = groupUsage([row('some-proxy', 'claude-opus-5-5', 10)]);
    expect(t[0].vendor).toBe('claude');
    const t2 = groupUsage([row('some-proxy', 'weird', 10)]);
    expect(t2[0].vendor).toBe('some-proxy');
  });

  it('returns an empty list for no rows', () => {
    expect(groupUsage([])).toEqual([]);
  });
});
