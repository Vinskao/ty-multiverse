import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initBenchmarkDiagram } from '../../src/scripts/market/benchmarkDiagram';

// 2026-11-10: the supply chain diagram showed as raw Mermaid text because nothing on the homepage rendered it
// (only About loads Mermaid).
describe('Taiwan semiconductor benchmark diagram', () => {
  const page = '<section id="benchmark"><section class="overview" id="benchmark-overview"><h5>圖</h5><pre class="mermaid">flowchart LR\n  a --> b</pre></section></section>';
  beforeEach(() => { document.body.innerHTML = page; });
  const settle = () => new Promise((done) => setTimeout(done, 0));

  it('draws immediately and only once in the permanently visible panel', async () => {
    const run = vi.fn(async ({ nodes }: { nodes: HTMLElement[] }) => { nodes.forEach((node) => node.setAttribute('data-processed', 'true')); });
    const load = vi.fn(async () => ({ initialize: vi.fn(), run }));
    initBenchmarkDiagram(document, load);
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0].nodes).toEqual([document.querySelector('pre.mermaid')]);
    initBenchmarkDiagram(document, load);
    await settle();
    expect(run).toHaveBeenCalledTimes(1); // already drawn
  });

  it('says so instead of leaving raw source when Mermaid cannot load', async () => {
    initBenchmarkDiagram(document, () => Promise.reject(new Error('offline')));
    await settle();
    expect(document.querySelector('pre.mermaid')).toBeNull();
    expect(document.querySelector('.overview')!.textContent).toContain('無法載入');
  });

  it('is wired into the benchmark component', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/SemiconductorBenchmark.astro'), 'utf8');
    expect(source).toContain('initBenchmarkDiagram');
    expect(source).toMatch(/<section[^>]+id="benchmark-overview"/);
    expect(source).not.toContain('<details class="overview"');
  });

  it('adds readable zoom controls after rendering the dense benchmark graph', async () => {
    const run = vi.fn(async ({ nodes }: { nodes: HTMLElement[] }) => {
      nodes[0].innerHTML = '<svg width="1800"></svg>';
      nodes[0].setAttribute('data-processed', 'true');
    });
    initBenchmarkDiagram(document, async () => ({ initialize: vi.fn(), run }));
    await settle();
    expect(document.querySelector('button[aria-label="放大圖表"]')).not.toBeNull();
    expect((document.querySelector('svg') as SVGSVGElement).style.maxWidth).toBe('none');
  });
});
