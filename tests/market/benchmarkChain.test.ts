import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { supplyChainDiagram } from '../../src/scripts/market/benchmarkChain';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

// 2026-11-10: sixteen companies in one left-to-right chain rendered too small to read.
describe('benchmark supply chain diagram layout', () => {
  const diagram = supplyChainDiagram([
    { code: '1785', company_name: '光洋科', segment: '濺鍍靶材' },
    { code: '6488', company_name: '環球晶', segment: '8 吋與 12 吋矽晶圓' },
    { code: '2330', company_name: '台積電', segment: '專業晶圓代工與 CoWoS' },
    { code: '2454', company_name: '聯發科', segment: 'IC 設計與終端應用' },
  ]);

  it('stacks the stages, one row each', () => {
    expect(diagram.startsWith('flowchart TB')).toBe(true);
    expect(diagram.match(/direction LR/g)).toHaveLength(3);
    expect(diagram).toContain('stage0 --> stage1');
    expect(diagram).toContain('stage1 --> stage2');
  });

  it('keeps a stage in one row without linking companies across stages', () => {
    expect(diagram).toContain('c1785 --> c6488');
    expect(diagram).not.toContain('c6488 --> c2330');
  });

  it('files equipment makers under equipment, not wafer fabrication', () => {
    const lines = supplyChainDiagram([
      { code: '2330', company_name: '台積電', segment: '專業晶圓代工與 CoWoS' },
      { code: '3583', company_name: '辛耘', segment: '晶圓濕蝕刻' },
      { code: '6937', company_name: '天虹', segment: 'PVD、PECVD、ALD 薄膜設備' },
    ]);
    expect(lines).toContain('c3583 --> c6937');
    expect(lines).not.toContain('c2330 --> c3583');
  });

  it('is what the benchmark component draws', () => {
    expect(read('src/components/SemiconductorBenchmark.astro')).toContain("from '../scripts/market/benchmarkChain'");
  });
});

describe('benchmark leads into the research reports', () => {
  // The owner picks reports to read from the benchmark backbone; the page has to say so.
  it('explains that the reports below are chosen from the benchmark', () => {
    expect(read('src/components/SemiconductorBenchmark.astro')).toContain('依這條路線');
    expect(read('src/pages/index.astro')).toContain('依上方 Benchmark 骨幹');
  });
});

describe('main menu', () => {
  it('has no Home tab (the brand links home) and calls the articles Blog', () => {
    const nav = read('src/components/Nav.astro');
    expect(nav).not.toContain('i18nKey: "nav.home"');
    expect(nav).toContain('label: "Blog"');
    expect(JSON.parse(read('src/storages/i18n.json')).nav.work.en).toBe('Blog');
  });

  it('keeps the brand on one line and the social icons in one row on desktop', () => {
    const css = read('src/styles/nav.css');
    expect(css).toMatch(/grid-template-columns: minmax\(max-content, 1fr\) auto minmax\(max-content, 1fr\)/);
    expect(css).toMatch(/\.site-title \{[^}]*white-space: nowrap/);
    expect(css).toMatch(/@media \(min-width: 80em\) \{\s*\.socials \{[^}]*flex-wrap: nowrap/);
  });
});

// 2026-11-10: the line-up became versioned; version 2 pairs a leader with a peer in every stage.
describe('versioned benchmark line-up', () => {
  const lineup = {
    version: 2, name: 'n', rationale: 'r', is_current: true,
    layers: [
      { key: 'design', title: '設計', stages: [
        { title: 'IC 設計', companies: [{ code: '2454', company_name: '聯發科', segment: 's', role: '龍頭' }, { code: '2379', company_name: '瑞昱', segment: 's', role: '對照' }] },
        { title: '矽智財', companies: [{ code: '3443', company_name: '創意', segment: 's', role: '龍頭' }] },
      ] },
      { key: 'inputs', title: '材料', stages: [{ title: '矽晶圓', companies: [{ code: '6488', company_name: '環球晶', segment: 's', role: '龍頭' }] }] },
      { key: 'fab', title: '製造', stages: [{ title: '晶圓代工', companies: [{ code: '2330', company_name: '台積電', segment: 's', role: '龍頭' }] }] },
    ],
    flows: [{ from: 'design', to: 'fab', label: '委託製造' }, { from: 'inputs', to: 'fab', label: '供應' }],
  };

  it('draws one row per layer, joined by labelled arrows between rows', async () => {
    const { lineupDiagram } = await import('../../src/scripts/market/benchmarkChain');
    const diagram = lineupDiagram(lineup);
    expect(diagram.match(/direction LR/g)).toHaveLength(3);
    expect(diagram).toContain('L_design -->|委託製造| L_fab');
    expect(diagram).toContain('L_design ~~~ L_inputs'); // no flow between them, still stacked
    expect(diagram).not.toContain('L_inputs ~~~ L_fab');
  });

  it('joins a leader to its peer and leaves different stages unjoined', async () => {
    const { lineupDiagram } = await import('../../src/scripts/market/benchmarkChain');
    const diagram = lineupDiagram(lineup);
    expect(diagram).toContain('c2454 --- c2379');
    expect(diagram).toContain('c2379 ~~~ c3443');
    expect(diagram).toContain('class c2454,c3443,c6488,c2330 leader');
  });

  it('is shown with its version, its reason and the earlier versions', () => {
    const component = read('src/components/SemiconductorBenchmark.astro');
    expect(component).toContain('/market/benchmark/versions');
    expect(component).toContain('lineupDiagram');
    expect(component).toContain('benchmark-versions');
  });
});

describe('market overview text size', () => {
  // 2026-11-10: the benchmark text inherited a 26px display size from the page wrapper.
  it('sets its own body size instead of inheriting the wrapper display size', () => {
    expect(read('src/styles/index.css')).toMatch(/\.home-page \.market-overview \{[^}]*font-size:1rem/);
    expect(read('src/components/SemiconductorBenchmark.astro')).toMatch(/h4 \{[^}]*font-size: 1\.1rem/);
  });
});

describe('research method on the page', () => {
  it('states the route: benchmark, then macro, then single stocks', () => {
    const component = read('src/components/SemiconductorBenchmark.astro');
    expect(component).toContain('benchmark-method');
    expect(component).toContain('不是買進標的'); // benchmarks set guidance; they are not purchase candidates
    expect(component).toMatch(/Benchmark[\s\S]*href="\/macro\/"[\s\S]*href="\/stocks\/"/);
  });
});

// 2026-11-10: leaders sat side by side with no line between them. A line-up with links draws what each
// company hands to another, so the picture says why each one matters.
describe('company relations in the line-up diagram', () => {
  it('draws labelled arrows between companies and to the end market', async () => {
    const { lineupDiagram } = await import('../../src/scripts/market/benchmarkChain');
    const diagram = lineupDiagram({
      version: 3, name: 'n', rationale: 'r', is_current: true, flows: [],
      layers: [
        { key: 'design', title: '設計', stages: [
          { title: '自有產品 IC 設計', companies: [{ code: '2454', company_name: '聯發科', segment: 's', role: '龍頭' }] },
          { title: '代客設計（ASIC）', companies: [{ code: '3443', company_name: '創意', segment: 's', role: '龍頭' }] },
        ] },
        { key: 'fab', title: '製造', stages: [{ title: '先進製程晶圓代工', companies: [{ code: '2330', company_name: '台積電', segment: 's', role: '龍頭' }] }] },
      ],
      terminals: [{ key: 'market', title: '終端產品' }],
      links: [
        { from: '2454', to: '2330', label: '先進製程投片' },
        { from: '3443', to: '2330', label: '替雲端客戶設計後投片' },
        { from: '2330', to: 'market', label: '晶片' },
        { from: '9999', to: '2330', label: '不在名單' },
      ],
    });
    expect(diagram.startsWith('flowchart LR')).toBe(true);
    expect(diagram).toContain('c2454 -->|先進製程投片| c2330');
    expect(diagram).toContain('c2330 -->|晶片| t_market');
    expect(diagram).toContain('自有產品 IC 設計<br/><b>聯發科 2454</b>');
    expect(diagram).not.toContain('不在名單');
    expect(diagram).not.toContain('subgraph');
  });
});
