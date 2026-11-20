import { describe, expect, it, vi } from 'vitest';
import { conflictLabel, monitorConflicts, monitorCoverage, monitorDiagram, paceLabel } from '../../src/scripts/market/benchmarkMonitor';
import { initBenchmarkMonitor } from '../../src/scripts/market/benchmarkMonitorClient';
import type { LineupVersion } from '../../src/scripts/market/benchmarkChain';

const lineup: LineupVersion = { version: 5, name: 'Test', rationale: '', is_current: true,
  layers: [{ key: 'foundry', title: '晶圓', stages: [{ title: '代工', companies: [
    { code: '2330', company_name: '台積電', segment: 'foundry', role: 'leader' },
  ] }] }], flows: [], links: [{ from: '2330', to: 'cloud', label: '製造' }],
  terminals: [{ key: 'cloud', title: '雲端' }] };

describe('benchmark monitor diagram', () => {
  it('shows unknown instead of implying neutral when reports or checks are missing', () => {
    const diagram = monitorDiagram(lineup, { nodes: [], holdings: [], revision: '1' });
    expect(diagram).not.toContain('缺資料');
    expect(diagram).not.toContain('順風 0');
    expect(diagram).toContain('strength_unknown');
  });
  it('marks holdings without publishing position sizes and separates research links from supply', () => {
    const diagram = monitorDiagram(lineup, { revision: '2', nodes: [{ code: '2330', annual: { direction: 'mixed' },
      validation: { supportPercent: 50, headwindPercent: 25, unknownPercent: 25, counts: { support: 2, headwind: 1, unknown: 1, total: 4 } } }], holdings: [
      { code: '2330', name: '台積電', role: '代工', benchmarks: ['2330'] },
      { code: '6857-JP', name: '愛德萬', role: '測試', benchmarks: ['2330'] },
      { code: '6857', name: '宏碁智醫', role: '尚未定位' },
    ] });
    expect(diagram).toContain('年報多空並存');
    expect(diagram).toContain('加權 支持 50%・反駁 25%・未知 25%（4 項）');
    expect(diagram).toContain('持股');
    expect(diagram).toContain('|對照|');
    expect(diagram).toContain('h6857_JP');
    expect(diagram).not.toContain('h6857[');
  });
  it('refreshes holding labels after a new snapshot and stops polling after navigation', async () => {
    vi.useFakeTimers();
    const root = document.createElement('section');
    root.id = 'benchmark';
    root.dataset.lineup = JSON.stringify(lineup);
    root.innerHTML = '<section id="benchmark-overview" class="overview"><pre class="mermaid"></pre></section><select data-benchmark-evidence></select><div data-benchmark-readout></div><p data-benchmark-status></p>';
    document.body.replaceChildren(root);
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ revision: '1', nodes: [], holdings: [] }) })
      .mockResolvedValue({ ok: true, json: async () => ({ revision: '2', nodes: [], holdings: [
        { code: '2330', name: '台積電', role: '代工' }] }) });
    vi.stubGlobal('fetch', fetcher);
    try {
      initBenchmarkMonitor();
      await vi.advanceTimersByTimeAsync(0);
      expect(root.querySelector('pre')!.textContent).not.toContain('★ 持股');
      const panel = root.querySelector('#benchmark-overview')!;
      const viewport = document.createElement('div');
      viewport.className = 'market-research-diagram-viewport';
      viewport.append(panel.querySelector('pre')!);
      panel.append(viewport);
      const controls = document.createElement('div');
      controls.className = 'market-research-diagram-controls';
      panel.append(controls);
      await vi.advanceTimersByTimeAsync(60000);
      expect(root.querySelector('pre')!.textContent).toContain('★ 持股');
      expect(panel.querySelector('.market-research-diagram-controls')).toBeNull();
      expect(panel.querySelector('.market-research-diagram-viewport')).toBeNull();
      document.dispatchEvent(new Event('astro:before-swap'));
      await vi.advanceTimersByTimeAsync(60000);
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally { vi.useRealTimers(); vi.unstubAllGlobals(); }
  });
  it('shows counts, never a percentage, when only one or two checks exist', () => {
    const diagram = monitorDiagram(lineup, { revision: '3', holdings: [], nodes: [{ code: '2330', annual: { direction: 'tailwind' },
      validation: { supportPercent: null, headwindPercent: null, unknownPercent: null, counts: { support: 1, headwind: 0, unknown: 1, total: 2 } } }] });
    expect(diagram).toContain('驗證 支持 1・反駁 0・未知 1');
    expect(diagram).not.toContain('%');
  });
  it('reports evidence coverage and lists holdings it cannot place instead of drawing them', () => {
    const coverage = monitorCoverage(lineup, { revision: '3', nodes: [
      { code: '2330', annual: { direction: 'tailwind' }, claims: [{ report_id: 'r', page: 1, claim: 'c', evidence: 'e', source: 's', year: 2025 }] }],
      holdings: [{ code: '6834-JP', name: 'SEIKOH', role: '尚未定位' }, { code: '8996', name: '高力', role: 'AI 液冷', benchmarks: [] }] });
    expect(coverage.withClaims).toEqual(['2330']);
    expect(coverage.unplaced.map(holding => holding.code)).toEqual(['6834-JP', '8996']);
  });
  it('labels a holding ahead of or behind its benchmark with the gap, period and metric', () => {
    const diagram = monitorDiagram(lineup, { revision: '4', nodes: [], holdings: [
      { code: '8996', name: '高力', role: 'AI 液冷', benchmarks: ['2330'], pace: [{ benchmark: '2330', verdict: 'ahead',
        metric: '月營收年增率', period: '2026-10', holdingValue: 60, benchmarkValue: 30, gapPp: 30 }] }] });
    expect(diagram).toContain('超前 台積電 +30.0pp（2026-10 月營收年增率）');
    expect(diagram).toContain('stroke:#3fb950');
    expect(paceLabel({ benchmark: '2330', verdict: 'unknown', metric: null, period: null, holdingValue: null, benchmarkValue: null, gapPp: null }))
      .toBe('對照 2330：資料不足');
  });
  it('labels an aging annual report with how much weight it still carries, and stays plain when fresh', () => {
    const node = (recency: number | null) => ({ code: '2330', annual: { direction: 'tailwind', recency } });
    expect(monitorDiagram(lineup, { revision: '4', holdings: [], nodes: [node(0.62)] })).toContain('年報順風（參考力 62%）');
    expect(monitorDiagram(lineup, { revision: '5', holdings: [], nodes: [node(1)] })).not.toContain('參考力');
    expect(monitorDiagram(lineup, { revision: '6', holdings: [], nodes: [node(null)] })).not.toContain('參考力');
  });
  it('fades only the fill of an aging report, keeping hue and never turning it unknown', () => {
    const node = (recency: number | null) => ({ code: '2330', annual: { direction: 'tailwind', recency } });
    expect(monitorDiagram(lineup, { revision: '7', holdings: [], nodes: [node(0.5)] })).toContain('class c2330 strength_tailwind_faded');
    expect(monitorDiagram(lineup, { revision: '8', holdings: [], nodes: [node(1)] })).toContain('class c2330 strength_tailwind\n');
    expect(monitorDiagram(lineup, { revision: '9', holdings: [], nodes: [node(null)] })).not.toContain('_faded\n');
    expect(monitorDiagram(lineup, { revision: '10', holdings: [], nodes: [node(0.5)] })).toContain('classDef strength_tailwind_faded');
  });
  it('flags a tailwind narrative that checks mostly refute, and an aging report whose checks are almost all unknown', () => {
    const base = { code: '2330', claims: [{ report_id: 'r', page: 1, claim: 'c', evidence: 'e', source: 's', year: 2024 }] };
    const breaking = { ...base, annual: { direction: 'tailwind', recency: 1 },
      validation: { supportPercent: 20, headwindPercent: 60, unknownPercent: 20, counts: { support: 1, headwind: 3, unknown: 1, total: 5 } } };
    const hollow = { ...base, code: '3037', annual: { direction: 'tailwind', recency: 0.5 },
      validation: { supportPercent: null, headwindPercent: null, unknownPercent: null, counts: { support: 0, headwind: 0, unknown: 2, total: 2 } } };
    const solid = { ...base, code: '2454', annual: { direction: 'tailwind', recency: 1 } };
    const found = monitorConflicts({ revision: 'c', holdings: [], nodes: [breaking, hollow, solid] });
    expect(found).toEqual([{ code: '2330', kind: 'breaking', direction: 'tailwind' }, { code: '3037', kind: 'hollow', direction: 'tailwind' }]);
    expect(monitorDiagram(lineup, { revision: 'd', holdings: [], nodes: [breaking] })).toContain('⚠ 分歧');
  });
  it('counts how many reports have started to fade', () => {
    const coverage = monitorCoverage(lineup, { revision: 'e', holdings: [], nodes: [
      { code: '2330', annual: { direction: 'tailwind', recency: 0.4 }, claims: [{ report_id: 'r', page: 1, claim: 'c', evidence: 'e', source: 's', year: 2024 }] }] });
    expect(coverage.aging).toBe(1);
  });
  it('words a breaking narrative by its own direction, so a headwind node is not called tailwind', () => {
    const headwind = { code: '2330', claims: [{ report_id: 'r', page: 1, claim: 'c', evidence: 'e', source: 's', year: 2025 }],
      annual: { direction: 'headwind', recency: 1 },
      validation: { supportPercent: 60, headwindPercent: 20, unknownPercent: 20, counts: { support: 3, headwind: 1, unknown: 1, total: 5 } } };
    const found = monitorConflicts({ revision: 'h', holdings: [], nodes: [headwind] });
    expect(found).toEqual([{ code: '2330', kind: 'breaking', direction: 'headwind' }]);
    expect(conflictLabel(found[0].kind, found[0].direction)).toContain('年報逆風');
    expect(conflictLabel(found[0].kind, found[0].direction)).not.toContain('順風');
    expect(conflictLabel('breaking', 'tailwind')).toContain('年報順風');
  });
  it('keeps the holding gold frame as a class declared after the direction colours, so classDef cannot override it', () => {
    const diagram = monitorDiagram(lineup, { revision: 'g', nodes: [{ code: '2330', annual: { direction: 'mixed', recency: 0.5 } }],
      holdings: [{ code: '2330', name: '台積電', role: '代工', benchmarks: ['2330'] }] });
    expect(diagram).toContain('class c2330 held');
    expect(diagram.lastIndexOf('classDef held')).toBeGreaterThan(diagram.lastIndexOf('classDef strength_'));
  });
  it('says the fiscal year is missing instead of printing undefined', async () => {
    vi.useFakeTimers();
    const root = document.createElement('section');
    root.id = 'benchmark';
    root.dataset.lineup = JSON.stringify(lineup);
    root.innerHTML = '<section id="benchmark-overview"><pre class="mermaid"></pre></section><select data-benchmark-evidence><option value="2330">2330</option></select><div data-benchmark-readout></div><p data-benchmark-status></p>';
    document.body.replaceChildren(root);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ revision: 'y', holdings: [], nodes: [{ code: '2330',
      annual: { direction: 'mixed', recency: null }, claims: [{ report_id: 'r', page: 3, claim: 'c', evidence: 'e', source: 'https://x' }] }] }) }));
    try {
      initBenchmarkMonitor();
      await vi.advanceTimersByTimeAsync(0);
      const text = root.querySelector('[data-benchmark-readout]')!.textContent!;
      expect(text).not.toContain('undefined');
      expect(text).toContain('缺財年');
    } finally { vi.useRealTimers(); vi.unstubAllGlobals(); }
  });
});
