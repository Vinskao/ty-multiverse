import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildBenchmarkIndex, searchBenchmark } from '../../src/scripts/search/benchmarkIndex';
import { initSitePalette } from '../../src/scripts/search/sitePalette';
import { highlightSearchTarget } from '../../src/scripts/market/benchmarkDiagram';
import type { LineupVersion } from '../../src/scripts/market/benchmarkChain';

// 2026-11-12: nothing drawn in 供應鏈綜觀研究圖 could be found from the nav bar search.
const lineup = { version: 5, name: 'v5', rationale: 'r', is_current: true, flows: [], layers: [
  { key: 'rack', title: '機櫃元件', stages: [{ title: '電源與散熱', companies: [
    { code: '2308', company_name: '台達電', segment: '資料中心電源與散熱', role: 'r' }] }] },
  { key: 'foundry', title: '晶圓製造', stages: [{ title: '先進製程', companies: [
    { code: '2330', company_name: '台積電', segment: '晶圓代工', role: 'r' }] }] },
] } as LineupVersion;
const monitor = { revision: '1', nodes: [{ code: '2330', annual: { direction: 'tailwind' }, claims: [
  { report_id: 'r1', page: 12, claim: 'CoWoS 產能持續倍增', evidence: 'CoWoS capacity', source: 's', year: 2025 }] }],
  holdings: [{ code: '8996', name: '高力', role: 'AI 液冷散熱', benchmarks: ['2308'] }] };
const outlook = '【年度格局】2026\n一句話：AI 需求延續\nT1 先進封裝產能\n依據：台積電年報\nT2 機櫃液冷\n依據：台達電年報';

describe('supply-chain diagram search index', () => {
  const entries = buildBenchmarkIndex(lineup, monitor, outlook);

  it('indexes companies with their layer and stage, holdings, claims and outlook themes', () => {
    expect(searchBenchmark(entries, '台達電').map(e => e.kind)).toEqual(['company', 'stock', 'holding', 'theme']);
    expect(searchBenchmark(entries, '散熱')[0].href).toBe('/?benchmark=2308#benchmark');
    expect(searchBenchmark(entries, '高力')[0].href).toBe(`/stocks/?${new URLSearchParams({ stock: '8996', name: '高力', tab: 'research' })}`);
    expect(searchBenchmark(entries, '高力')[0].detail).toContain('對照 台達電');
    expect(searchBenchmark(entries, 'cowos').map(e => e.kind)).toEqual(['claim']);
    expect(searchBenchmark(entries, '液冷').some(e => e.kind === 'theme' && e.title.includes('T2 機櫃液冷'))).toBe(true);
    expect(searchBenchmark(entries, '晶圓 先進製程').map(e => e.title)).toEqual(['台積電 2330']);
    expect(searchBenchmark(entries, '   ')).toEqual([]);
  });

  it('survives missing data', () => {
    expect(buildBenchmarkIndex(null, null, null)).toEqual([]);
  });
});

describe('nav bar search includes the diagram', () => {
  let cleanup = () => {};
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('shows diagram hits above report hits and fetches the index only once', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="site-search" hidden><input id="site-search-input" /><div id="site-search-results"></div><p id="site-search-status"></p></div>';
    const fetcher = vi.fn((url: string) => Promise.resolve({ ok: true, json: () => Promise.resolve(
      url.startsWith('/api/search/benchmark') ? { entries: buildBenchmarkIndex(lineup, monitor, outlook) } : { results: [] }) } as Response));
    cleanup = initSitePalette(document, fetcher, 10);
    const input = document.getElementById('site-search-input') as HTMLInputElement;
    for (const q of ['台達電', '高力']) {
      input.value = q;
      input.dispatchEvent(new Event('input'));
      await vi.advanceTimersByTimeAsync(10);
    }
    const hit = document.querySelector<HTMLAnchorElement>('#site-search-results a')!;
    expect(hit.textContent).toContain('高力');
    expect(hit.textContent).toContain('持股・個股研究');
    expect(fetcher.mock.calls.filter(([url]) => url === '/api/search/benchmark')).toHaveLength(1);
  });
});

describe('landing from a search hit', () => {
  it('outlines the searched node in the rendered diagram', () => {
    document.body.innerHTML = '<details class="overview"><svg><g class="node" id="flowchart-c2330-1"></g><g class="node" id="flowchart-c2308-2"></g></svg></details>';
    const node = highlightSearchTarget(document.querySelector('details')!, document, '?benchmark=2308');
    expect(node?.id).toBe('flowchart-c2308-2');
    expect(node?.classList.contains('is-search-target')).toBe(true);
  });
});
