import { afterEach, describe, expect, it } from 'vitest';
import { landSearchHit } from '../../src/scripts/search/landing';
import { buildMacroIndex } from '../../src/scripts/search/macroIndex';
import { buildBenchmarkIndex, searchBenchmark } from '../../src/scripts/search/benchmarkIndex';
import { focusEvidence } from '../../src/scripts/market/benchmarkMonitorClient';
import { stockDeepLink } from '../../src/scripts/market/stockDeepLink';
import type { LineupVersion } from '../../src/scripts/market/benchmarkChain';

// 2026-11-13: searching 台積電 only offered the diagram, and every hit landed somewhere generic.
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
let cleanup = () => {};
afterEach(() => { cleanup(); document.body.innerHTML = ''; });

describe('a company search offers its Benchmark evidence and its stock page first', () => {
  const lineup = { version: 5, name: 'v5', rationale: 'r', is_current: true, flows: [], layers: [
    { key: 'foundry', title: '晶圓製造', stages: [{ title: '先進製程', companies: [
      { code: '2330', company_name: '台積電', segment: '晶圓代工', role: 'r' },
      { code: 'NVDA', company_name: 'NVIDIA', segment: 'GPU', role: 'r' }] }] }] } as LineupVersion;
  const entries = buildBenchmarkIndex(lineup, null, null);

  it('ranks the Benchmark entry, then the stock page with name for non-holdings', () => {
    const [benchmark, stock] = searchBenchmark(entries, '台積電');
    expect(benchmark.href).toBe('/?benchmark=2330#benchmark');
    expect(stock.kind).toBe('stock');
    expect(stockDeepLink(new URL(stock.href, 'https://x').search)).toEqual({ code: '2330', name: '台積電', tab: 'research' });
  });

  it('offers no stock page for overseas codes it cannot place', () => {
    expect(searchBenchmark(entries, 'NVIDIA').map(e => e.kind)).toEqual(['company']);
  });

  it('lands on the company evidence picker instead of the diagram', () => {
    document.body.innerHTML = '<section><label><select data-benchmark-evidence><option value=""></option><option value="2330"></option></select></label></section>';
    expect(focusEvidence(document, '?benchmark=2330')?.value).toBe('2330');
    expect(focusEvidence(document, '?benchmark=9999')).toBeNull();
  });
});

describe('macro indicators are searchable and land on their chart', () => {
  it('finds a yield by Chinese name or code and links to the 總體 page', () => {
    const hits = searchBenchmark(buildMacroIndex(), '2 年期公債');
    expect(hits[0].kind).toBe('macro');
    expect(hits[0].href).toBe('/macro/?series=DGS2&group=rates');
    expect(searchBenchmark(buildMacroIndex(), '總經評論')[0].href).toBe('/macro/#macro-commentary');
  });

  it('switches to the indicator grid and outlines the chart once it renders', async () => {
    document.body.innerHTML = '<button data-macro-view="grid"></button><div id="macro-indicator-grid"></div>';
    let clicked = false;
    document.querySelector('button')!.addEventListener('click', () => { clicked = true; });
    cleanup = landSearchHit(document, { search: '?series=DGS2&group=rates', hash: '' });
    const grid = document.getElementById('macro-indicator-grid')!;
    grid.innerHTML = '<article data-macro-group="rates"><section data-macro-codes="DGS3MO DGS2"></section></article>';
    await tick();
    expect(clicked).toBe(true);
    expect(grid.querySelector('[data-macro-codes]')!.classList.contains('is-search-landing')).toBe(true);
  });
});

describe('report and outlook hits land on their target', () => {
  it('outlines the report card holding that report', async () => {
    document.body.innerHTML = '<section id="market-reports"></section>';
    cleanup = landSearchHit(document, { search: '?q=CoWoS&report=r2', hash: '' });
    document.getElementById('market-reports')!.innerHTML = '<article data-report-ids="r1"></article><article data-report-ids="r2 r3"></article>';
    await tick();
    expect(document.querySelectorAll('.is-search-landing')).toHaveLength(1);
    expect((document.querySelector('.is-search-landing') as HTMLElement).dataset.reportIds).toBe('r2 r3');
  });

  it('opens the annual outlook panel', () => {
    document.body.innerHTML = '<details id="benchmark-outlook"></details>';
    landSearchHit(document, { search: '', hash: '#benchmark-outlook' });
    expect((document.getElementById('benchmark-outlook') as HTMLDetailsElement).open).toBe(true);
  });
});
