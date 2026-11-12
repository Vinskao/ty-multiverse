import { describe, expect, it, vi } from 'vitest';
import { monitorDiagram } from '../../src/scripts/market/benchmarkMonitor';
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
    expect(diagram).toContain('年報待審／缺資料');
    expect(diagram).not.toContain('順風 0');
  });
  it('marks holdings without publishing position sizes and separates research links from supply', () => {
    const diagram = monitorDiagram(lineup, { revision: '2', nodes: [{ code: '2330', annual: { direction: 'mixed' },
      validation: { supportPercent: 50, headwindPercent: 25, unknownPercent: 25, counts: { support: 2, headwind: 1, unknown: 1, total: 4 } } }], holdings: [
      { code: '2330', name: '台積電', role: '代工', benchmarks: ['2330'] },
      { code: '6857-JP', name: '愛德萬', role: '測試', benchmarks: ['2330'] },
      { code: '6857', name: '宏碁智醫', role: '尚未定位' },
    ] });
    expect(diagram).toContain('年報多空並存');
    expect(diagram).toContain('驗證 支持 2・反駁 1・未知 1（共 4 條）');
    expect(diagram).not.toContain('%');
    expect(diagram).toContain('持股');
    expect(diagram).toContain('研究定位，非供貨關係');
    expect(diagram).toContain('h6857_JP');
    expect(diagram).toContain('h6857[');
  });
  it('refreshes holding labels after a new snapshot and stops polling after navigation', async () => {
    vi.useFakeTimers();
    const root = document.createElement('section');
    root.id = 'benchmark';
    root.dataset.lineup = JSON.stringify(lineup);
    root.innerHTML = '<details class="overview"><pre class="mermaid"></pre></details><select data-benchmark-evidence></select><div data-benchmark-readout></div><p data-benchmark-status></p>';
    document.body.replaceChildren(root);
    const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ revision: '1', nodes: [], holdings: [] }) })
      .mockResolvedValue({ ok: true, json: async () => ({ revision: '2', nodes: [], holdings: [
        { code: '2330', name: '台積電', role: '代工' }] }) });
    vi.stubGlobal('fetch', fetcher);
    try {
      initBenchmarkMonitor();
      await vi.advanceTimersByTimeAsync(0);
      expect(root.querySelector('pre')!.textContent).not.toContain('★ 持股');
      const panel = root.querySelector('details')!;
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
    expect(diagram).toContain('驗證 支持 1・反駁 0・未知 1（共 2 條）');
  });
});
