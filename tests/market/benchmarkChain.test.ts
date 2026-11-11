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

// 2026-11-11: version 4 adds overseas leaders. Ids kept only digits, so every US ticker became the same node `c`.
describe('benchmark diagram with overseas companies', () => {
  it('gives each overseas company its own node and keeps Taiwan ids unchanged', async () => {
    const { lineupDiagram } = await import('../../src/scripts/market/benchmarkChain');
    const company = (code: string, name: string) => ({ code, company_name: name, segment: 's', role: '龍頭' });
    const diagram = lineupDiagram({
      version: 4, name: 'n', rationale: 'r', is_current: true, flows: [],
      layers: [
        { key: 'design', title: '設計', stages: [{ title: 'AI 加速器', companies: [company('NVDA-US', 'NVIDIA')] }] },
        { key: 'fab', title: '製造', stages: [
          { title: '先進製程晶圓代工', companies: [company('2330', '台積電')] },
          { title: 'AI 記憶體（HBM）', companies: [company('000660-KR', 'SK 海力士')] },
        ] },
        { key: 'demand', title: '需求端', stages: [{ title: '雲端服務商', companies: [company('GOOGL-US', 'Alphabet'), company('META-US', 'Meta')] }] },
      ],
      links: [
        { from: 'NVDA-US', to: '2330', label: '投片' },
        { from: '000660-KR', to: '2330', label: 'HBM' },
        { from: 'NVDA-US', to: 'GOOGL-US', label: 'AI 加速器' },
        { from: 'NVDA-US', to: 'META-US', label: 'AI 加速器' },
      ],
    });
    expect(diagram).toContain('cNVDA_US -->|投片| c2330');
    expect(diagram).toContain('c000660_KR -->|HBM| c2330');
    expect(diagram).toContain('cNVDA_US -->|AI 加速器| cGOOGL_US');
    expect(diagram).toContain('cNVDA_US -->|AI 加速器| cMETA_US');
    const ids = [...diagram.matchAll(/^\s+(c\w+)\[/gm)].map(match => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('labels the section and report links for a mixed line-up', () => {
    const component = read('src/components/SemiconductorBenchmark.astro');
    expect(component).not.toContain('>台灣半導體 Benchmark<');
    expect(component).toContain('股東年報');
  });
});

// 2026-11-11: arrows mixed "orders from" with "ships to", and 創意 had no line to its cloud customers.
describe('benchmark diagram link kinds and group endpoints', () => {
  it('draws each kind with its own line style, boxes a group that a link points at, and exposes a legend', async () => {
    const { lineupDiagram, LINK_KINDS, lineupLegend } = await import('../../src/scripts/market/benchmarkChain');
    const company = (code: string, name: string) => ({ code, company_name: name, segment: 's', role: '龍頭' });
    const lineup = {
      version: 5, name: 'n', rationale: 'r', is_current: true, flows: [],
      layers: [
        { key: 'design', title: '設計', stages: [{ title: '代客設計（ASIC）', companies: [company('3443', '創意')] }] },
        { key: 'fab', title: '製造', stages: [{ title: '先進製程晶圓代工', companies: [company('2330', '台積電')] }] },
        { key: 'support', title: '廠務', stages: [{ title: '無塵室', companies: [company('2404', '漢唐')] }] },
        { key: 'demand', title: '需求端：雲端資本支出', stages: [{ title: '雲端服務商', companies: [company('GOOGL-US', 'Alphabet'), company('META-US', 'Meta')] }] },
      ],
      terminals: [{ key: 'market', title: '終端產品' }],
      links: [
        { from: '2330', to: '3443', kind: 'manufacture', label: 'ASIC 晶圓' },
        { from: '2404', to: '2330', kind: 'service', label: '無塵室' },
        { from: '3443', to: 'demand', kind: 'service', label: '自研 AI ASIC' },
        { from: '2330', to: 'market', kind: 'product', label: '晶片' },
      ],
    };
    const diagram = lineupDiagram(lineup);
    expect(diagram).toContain('c2330 ==>|ASIC 晶圓| c3443');
    expect(diagram).toContain('c2404 -.->|無塵室| c2330');
    expect(diagram).toContain('c3443 -.->|自研 AI ASIC| L_demand');
    expect(diagram).toContain('subgraph L_demand["需求端：雲端資本支出"]');
    expect(diagram).toMatch(/subgraph L_demand[^]*cGOOGL_US[^]*cMETA_US[^]*\n  end/);
    expect(Object.keys(LINK_KINDS)).toEqual(['supply', 'manufacture', 'service', 'product']);
    expect(lineupLegend(lineup).map(item => item.kind)).toEqual(['manufacture', 'service', 'product']);
    expect(lineupLegend({ ...lineup, links: [{ from: '2330', to: '3443', label: 'x' }] })).toEqual([]);
  });

  it('shows the legend under the diagram', () => {
    const component = read('src/components/SemiconductorBenchmark.astro');
    expect(component).toContain('lineupLegend');
    expect(component).toContain('箭頭從供應者指向客戶');
  });
});

// 2026-11-11: the annual AI outlook set from the benchmark is shown with it, and the public rules tell analysts to read it.
describe('annual AI outlook', () => {
  it('is fetched and shown in the benchmark section when it exists', () => {
    const component = read('src/components/SemiconductorBenchmark.astro');
    expect(component).toContain('/market/dashboard/analysis/AI?productType=outlook');
    expect(component).toContain('年度 AI 長線格局');
  });

  it('is part of the public analysis rules', () => {
    const rules = read('public/market-ai.md');
    expect(rules).toContain('productType=outlook');
    expect(rules).toContain('長線格局對照');
  });
});
