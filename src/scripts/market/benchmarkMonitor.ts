import { lineupDiagram, type LineupVersion } from './benchmarkChain';

export type MonitorNode = { code: string; annual: { direction: string }; claims?: {
  report_id: string; page: number; claim: string; evidence: string; source: string; year: number;
}[]; filing?: { fiscal_year: number; source_url: string; analysis_status: string | null } | null;
  validation?: { supportPercent: number | null; headwindPercent: number | null;
  unknownPercent: number | null; counts?: { support: number; headwind: number; unknown: number; total: number }; checks?: { code: string; metric: string; value: number | null;
    period: string; source: string; threshold: number; rationale: string; outcome: string }[] } };
export type BenchmarkMonitor = { nodes: MonitorNode[]; holdings: {
  code: string; name: string; role: string; benchmarks?: string[] }[]; revision: string; holdingsSnapshotAt?: string | null };

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
    const label = directions[direction] ?? directions.unknown;
    // Counts, not percentages: with a handful of checks "50%" reads as far more certain than "2 of 4".
    const counts = validation?.counts;
    const score = counts?.total
      ? `驗證 支持 ${counts.support}・反駁 ${counts.headwind}・未知 ${counts.unknown}（共 ${counts.total} 條）`
      : '近期驗證待設定／缺資料';
    const nodeId = `c${id(company.code)}`;
    const index = lines.findIndex(line => line.trimStart().startsWith(`${nodeId}[`));
    if (index >= 0) lines[index] = lines[index].replace(/"\]$/, `<br/>${held ? '★ 持股・' : ''}${label}<br/>${score}"]`);
    additions.push(`  class ${nodeId} strength_${Object.hasOwn(directions, direction) ? direction : 'unknown'}`);
    if (held) additions.push(`  style ${nodeId} stroke:#d4a72c,stroke-width:4px`);
  }
  for (const holding of monitor.holdings.filter(holding => !companyCodes.has(holding.code))) {
    const holdingId = `h${id(holding.code)}`;
    additions.push(`  ${holdingId}["★ 持股 ${safe(holding.name)} ${safe(holding.code)}<br/>${safe(holding.role)}"]`);
    additions.push(`  style ${holdingId} fill:#302b16,stroke:#d4a72c,color:#fff,stroke-width:3px`);
    for (const code of holding.benchmarks ?? []) {
      if (companyCodes.has(code)) additions.push(`  ${holdingId} -.->|研究定位，非供貨關係| c${id(code)}`);
    }
  }
  additions.push('  classDef strength_tailwind fill:#173c2c,stroke:#3fb950,color:#fff',
    '  classDef strength_headwind fill:#48232b,stroke:#f47067,color:#fff',
    '  classDef strength_mixed fill:#44391c,stroke:#d4a72c,color:#fff',
    '  classDef strength_neutral fill:#213b50,stroke:#58a6ff,color:#fff',
    '  classDef strength_unknown fill:#30363d,stroke:#8b949e,color:#fff');
  return [...lines, ...additions].join('\n');
}
