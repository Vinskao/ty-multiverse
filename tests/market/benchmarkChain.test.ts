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
    expect(read('src/components/SemiconductorBenchmark.astro')).toContain('研究報告的骨幹');
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
