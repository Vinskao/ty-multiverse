import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initBenchmarkDiagram } from '../../src/scripts/market/benchmarkDiagram';

// 2026-11-10: the supply chain diagram showed as raw Mermaid text because nothing on the homepage rendered it
// (only About loads Mermaid).
describe('Taiwan semiconductor benchmark diagram', () => {
  const page = '<section id="benchmark"><details class="overview"><summary>圖</summary><pre class="mermaid">flowchart LR\n  a --> b</pre></details></section>';
  beforeEach(() => { document.body.innerHTML = page; });
  const open = async () => {
    const details = document.querySelector('details')!;
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    await new Promise((done) => setTimeout(done, 0));
  };

  it('draws the diagram when its panel is opened, and loads Mermaid only then', async () => {
    const run = vi.fn(async ({ nodes }: { nodes: HTMLElement[] }) => { nodes.forEach((node) => node.setAttribute('data-processed', 'true')); });
    const load = vi.fn(async () => ({ initialize: vi.fn(), run }));
    initBenchmarkDiagram(document, load);
    expect(load).not.toHaveBeenCalled();
    await open();
    expect(load).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0].nodes).toEqual([document.querySelector('pre.mermaid')]);
    await open();
    expect(run).toHaveBeenCalledTimes(1); // already drawn
  });

  it('says so instead of leaving raw source when Mermaid cannot load', async () => {
    initBenchmarkDiagram(document, () => Promise.reject(new Error('offline')));
    await open();
    expect(document.querySelector('pre.mermaid')).toBeNull();
    expect(document.querySelector('.overview')!.textContent).toContain('無法載入');
  });

  it('is wired into the benchmark component', () => {
    expect(readFileSync(resolve(process.cwd(), 'src/components/SemiconductorBenchmark.astro'), 'utf8')).toContain('initBenchmarkDiagram');
  });
});
