import { lineupDiagram, type LineupVersion } from './benchmarkChain';

export type MonitorNode = { code: string; annual: { direction: string; recency?: number | null }; claims?: {
  report_id: string; page: number; claim: string; evidence: string; source: string; year: number;
}[]; filing?: { fiscal_year: number; source_url: string; analysis_status: string | null } | null;
  validation?: { supportPercent: number | null; headwindPercent: number | null;
  unknownPercent: number | null; counts?: { support: number; headwind: number; unknown: number; total: number }; checks?: { code: string; metric: string; value: number | null;
    period: string; source: string; threshold: number; weight?: number; rationale: string; outcome: string }[] } };
export type HoldingPace = { benchmark: string; verdict: 'ahead' | 'inline' | 'behind' | 'unknown'; metric: string | null;
  period: string | null; holdingValue: number | null; benchmarkValue: number | null; gapPp: number | null };
const PACE: Record<string, string> = { ahead: '超前', inline: '同步', behind: '落後' };

/** "超前 台達電 +30.0pp（2026-10 月營收年增率）"; unknown stays explicit instead of passing as in line. */
export function paceLabel(pace: HoldingPace, name = pace.benchmark): string {
  if (pace.verdict === 'unknown' || pace.gapPp === null) return `對照 ${name}：資料不足`;
  const sign = pace.gapPp > 0 ? '+' : '';
  return `${PACE[pace.verdict]} ${name} ${sign}${pace.gapPp.toFixed(1)}pp（${pace.period ?? ''} ${pace.metric ?? ''}）`;
}

type Validation = NonNullable<MonitorNode['validation']>;

/** "加權 支持 50%・反駁 25%・未知 25%（4 項）": weighted share of checks; unknown stays in the denominator. */
export function weightedLabel(validation: Validation, total: number): string {
  const pct = (value: number | null) => `${Math.round(value ?? 0)}%`;
  return `加權 支持 ${pct(validation.supportPercent)}・反駁 ${pct(validation.headwindPercent)}・未知 ${pct(validation.unknownPercent)}（${total} 項）`;
}

/** Share of the total weight this check carries, e.g. "權重 2（占 50%）". */
export function weightShare(weight: number | undefined, checks: { weight?: number }[]): string {
  const total = checks.reduce((sum, item) => sum + (item.weight ?? 0), 0);
  if (!weight || !total) return '';
  return `權重 ${weight}（占 ${Math.round(weight / total * 100)}%）`;
}

export type BenchmarkMonitor = { nodes: MonitorNode[]; holdings: {
  code: string; name: string; role: string; benchmarks?: string[]; pace?: HoldingPace[] }[]; revision: string; holdingsSnapshotAt?: string | null };

const safe = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '#quot;').replaceAll('[', '&#91;').replaceAll(']', '&#93;').replaceAll('|', '/').replace(/[\r\n]/g, ' ');
const id = (code: string) => code.replace(/[^A-Za-z0-9]/g, '_');
const directions: Record<string, string> = { tailwind: '年報順風', headwind: '年報逆風', neutral: '年報中性',
  mixed: '年報多空並存', unknown: '年報待審／缺資料' };

export function monitorDiagram(lineup: LineupVersion, monitor: BenchmarkMonitor): string {
  const nodes = new Map(monitor.nodes.map(node => [node.code, node]));
  const companies = lineup.layers.flatMap(layer => layer.stages.flatMap(stage => stage.companies));
  const companyCodes = new Set(companies.map(company => company.code));
  const lines = lineupDiagram(lineup).split('\n');
  const additions: string[] = [];
  for (const company of companies) {
    const node = nodes.get(company.code);
    const direction = node?.annual.direction ?? 'unknown';
    const validation = node?.validation;
    const held = monitor.holdings.some(holding => holding.code === company.code);
    // Only real evidence goes on a node: an empty "待審／缺資料" line on every box says nothing.
    const parts: string[] = [];
    if (held) parts.push('★ 持股');
    if (direction !== 'unknown' && directions[direction]) {
      // An older report still counts, but at a reduced weight; fresh ones stay unlabelled.
      const recency = node?.annual.recency;
      parts.push(recency != null && recency < 1 ? `${directions[direction]}（參考力 ${Math.round(recency * 100)}%）` : directions[direction]);
    }
    // The API only returns percentages from 3 checks up; below that show counts so "50%" never overstates certainty.
    const counts = validation?.counts;
    if (validation?.supportPercent != null && counts?.total) parts.push(weightedLabel(validation, counts.total));
    else if (counts?.total) parts.push(`驗證 支持 ${counts.support}・反駁 ${counts.headwind}・未知 ${counts.unknown}`);
    const nodeId = `c${id(company.code)}`;
    const index = lines.findIndex(line => line.trimStart().startsWith(`${nodeId}[`));
    if (index >= 0 && parts.length) lines[index] = lines[index].replace(/"\]$/, `<br/>${parts.join('・')}"]`);
    additions.push(`  class ${nodeId} strength_${Object.hasOwn(directions, direction) ? direction : 'unknown'}`);
    if (held) additions.push(`  style ${nodeId} stroke:#d4a72c,stroke-width:4px`);
  }
  // A holding is drawn only when it is tied to a benchmark node; an unattached box cannot be read against anything.
  for (const holding of positionedHoldings(monitor, companyCodes)) {
    const holdingId = `h${id(holding.code)}`;
    const names = new Map(companies.map(company => [company.code, company.company_name]));
    const pace = (holding.pace ?? []).map(item => `<br/>${safe(paceLabel(item, names.get(item.benchmark) ?? item.benchmark))}`).join('');
    additions.push(`  ${holdingId}["★ 持股 ${safe(holding.name)} ${safe(holding.code)}<br/>${safe(holding.role)}${pace}"]`);
    const verdicts = new Set((holding.pace ?? []).map(item => item.verdict));
    const stroke = verdicts.has('behind') ? '#f47067' : verdicts.has('ahead') ? '#3fb950' : '#d4a72c';
    additions.push(`  style ${holdingId} fill:#302b16,stroke:${stroke},color:#fff,stroke-width:3px`);
    for (const code of holding.benchmarks ?? []) {
      if (companyCodes.has(code)) additions.push(`  ${holdingId} -.->|對照| c${id(code)}`);
    }
  }
  additions.push('  classDef strength_tailwind fill:#173c2c,stroke:#3fb950,color:#fff',
    '  classDef strength_headwind fill:#48232b,stroke:#f47067,color:#fff',
    '  classDef strength_mixed fill:#44391c,stroke:#d4a72c,color:#fff',
    '  classDef strength_neutral fill:#213b50,stroke:#58a6ff,color:#fff',
    '  classDef strength_unknown fill:#30363d,stroke:#8b949e,color:#fff');
  return [...lines, ...additions].join('\n');
}

const positionedHoldings = (monitor: BenchmarkMonitor, companyCodes: Set<string>) => monitor.holdings
  .filter(holding => !companyCodes.has(holding.code) && (holding.benchmarks ?? []).some(code => companyCodes.has(code)));

/** Holdings the diagram cannot place yet, and how many benchmark nodes have any reviewed annual-report claim. */
export function monitorCoverage(lineup: LineupVersion, monitor: BenchmarkMonitor) {
  const companyCodes = new Set(lineup.layers.flatMap(layer => layer.stages.flatMap(stage => stage.companies.map(company => company.code))));
  const placed = new Set(positionedHoldings(monitor, companyCodes).map(holding => holding.code));
  const unplaced = monitor.holdings.filter(holding => !companyCodes.has(holding.code) && !placed.has(holding.code));
  const withClaims = monitor.nodes.filter(node => companyCodes.has(node.code) && (node.claims?.length ?? 0) > 0);
  const withChecks = monitor.nodes.filter(node => companyCodes.has(node.code) && (node.validation?.counts?.total ?? 0) > 0);
  return { total: companyCodes.size, withClaims: withClaims.map(node => node.code),
    withChecks: withChecks.length, unplaced };
}
