// Search index for the 供應鏈綜觀研究圖 on the home page: every benchmark company, its stage and layer, holdings
// compared against it, its reviewed annual-report claims and the annual outlook themes. Built server-side by
// /api/search/benchmark and filtered in the nav bar palette, so everything drawn in the diagram is findable.
import type { LineupVersion } from '../market/benchmarkChain';
import type { BenchmarkMonitor } from '../market/benchmarkMonitor';

export type BenchmarkEntry = { kind: 'company' | 'stock' | 'holding' | 'macro' | 'claim' | 'theme'; title: string; detail: string;
  text: string; href: string };

const href = (code?: string) => (code ? `/?benchmark=${encodeURIComponent(code)}#benchmark` : '/#benchmark');
/** The stock page's 研究 tab; name lets the page open a company that is not in the holdings list. */
export const stockHref = (code: string, name?: string) =>
  `/stocks/?${new URLSearchParams({ stock: code, ...(name ? { name } : {}), tab: 'research' })}`;
// Only Taiwan listings open on the stock page without a market; overseas codes would be ambiguous there.
const TAIWAN_CODE = /^\d{4,6}[A-Z]?$/;

export function buildBenchmarkIndex(lineup: LineupVersion | null, monitor: BenchmarkMonitor | null,
  outlook: string | null): BenchmarkEntry[] {
  const entries: BenchmarkEntry[] = [];
  const names = new Map<string, string>();
  for (const layer of lineup?.layers ?? []) {
    for (const stage of layer.stages) {
      for (const company of stage.companies) {
        names.set(company.code, company.company_name);
        const detail = [layer.title, stage.title, company.segment].filter(Boolean).join('・');
        entries.push({ kind: 'company', title: `${company.company_name} ${company.code}`, detail,
          text: [company.company_name, company.code, layer.title, stage.title, company.segment, company.role].join(' '),
          href: href(company.code) });
        if (TAIWAN_CODE.test(company.code)) entries.push({ kind: 'stock', title: `${company.company_name} ${company.code}`,
          detail: '價格、法人、基本面、研究與 AI 分析', text: [company.company_name, company.code].join(' '),
          href: stockHref(company.code, company.company_name) });
      }
    }
  }
  for (const holding of monitor?.holdings ?? []) {
    const against = (holding.benchmarks ?? []).map(code => names.get(code) ?? code);
    entries.push({ kind: 'holding', title: `★ ${holding.name} ${holding.code}`,
      detail: [holding.role, against.length ? `對照 ${against.join('、')}` : '尚未對照龍頭'].join('・'),
      text: [holding.name, holding.code, holding.role, ...against].join(' '), href: stockHref(holding.code, holding.name) });
  }
  for (const node of monitor?.nodes ?? []) {
    for (const claim of node.claims ?? []) {
      entries.push({ kind: 'claim', title: `${names.get(node.code) ?? node.code} ${claim.year} 年報 p.${claim.page}`,
        detail: claim.claim, text: [names.get(node.code), node.code, claim.claim, claim.evidence].join(' '),
        href: href(node.code) });
    }
  }
  // Outlook themes start with "T1 標題"; each theme block is one entry.
  for (const block of (outlook ?? '').split(/\n(?=T[1-9]\s)/).filter(part => /^T[1-9]\s/.test(part))) {
    const [first, ...rest] = block.split('\n');
    entries.push({ kind: 'theme', title: `年度格局 ${first.trim()}`, detail: rest.join(' ').trim().slice(0, 120),
      text: block, href: '/#benchmark-outlook' });
  }
  return entries;
}

/** Every whitespace-separated term must appear (case-insensitive); companies and holdings rank above claim text. */
export function searchBenchmark(entries: BenchmarkEntry[], query: string, limit = 10): BenchmarkEntry[] {
  const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const rank = { company: 0, stock: 1, holding: 2, macro: 3, theme: 4, claim: 5 } as const;
  return entries
    .filter(entry => { const text = `${entry.title} ${entry.text}`.toLocaleLowerCase(); return terms.every(term => text.includes(term)); })
    .sort((a, b) => rank[a.kind] - rank[b.kind])
    .slice(0, limit);
}
