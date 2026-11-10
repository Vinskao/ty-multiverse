// Mermaid source for the benchmark supply chain: one row per stage, stages stacked top to bottom.
// Companies come from the benchmark API, so the picture follows whichever companies are active.
export type ChainCompany = { code: string; company_name: string; segment: string };

const nodeId = (code: string) => `c${code.replace(/\D/g, '')}`;
const chainGroups: { title: string; matches: RegExp[] }[] = [
  { title: '材料與矽晶圓', matches: [/矽晶圓/, /靶材/, /特殊氣體/] },
  { title: '晶圓製造與廠務', matches: [/晶圓製造/, /晶圓代工/, /無塵室/, /廠務/] },
  { title: '製程設備、檢測與耗材', matches: [/設備/, /蝕刻/, /檢測/, /良率/, /CMP/, /鑽石碟/, /材料分析/, /可靠度/, /精密零件/] },
  { title: 'IC 設計', matches: [/IC 設計/] },
  { title: '封裝與測試', matches: [/封裝/, /測試/, /異質整合/] },
];

export function supplyChainDiagram(companies: ChainCompany[]): string {
  const used = new Set<string>();
  const groups = chainGroups.map(group => ({
    title: group.title,
    companies: companies.filter(company => group.matches.some(match => match.test(company.segment)) && !used.has(company.code))
      .filter(company => { used.add(company.code); return true; }),
  })).filter(group => group.companies.length);
  const unassigned = companies.filter(company => !used.has(company.code));
  if (unassigned.length) groups.push({ title: '其他半導體環節', companies: unassigned });
  const lines = ['flowchart TB'];
  groups.forEach((group, index) => {
    lines.push(`  subgraph stage${index}["${group.title}"]`);
    lines.push('    direction LR');
    group.companies.forEach(company => {
      const label = `${company.company_name} ${company.code}<br/>${company.segment}`
        .replaceAll('&', '&amp;').replaceAll('"', '#quot;').replaceAll('[', '&#91;').replaceAll(']', '&#93;');
      lines.push(`    ${nodeId(company.code)}["${label}"]`);
    });
    // Arrows inside a stage keep its companies in one row. A link to a node outside the subgraph
    // would make Mermaid drop the stage's own direction, so between stages the arrows join the stages.
    group.companies.slice(1).forEach((company, at) => {
      lines.push(`    ${nodeId(group.companies[at].code)} --> ${nodeId(company.code)}`);
    });
    lines.push('  end');
  });
  groups.slice(1).forEach((_, index) => lines.push(`  stage${index} --> stage${index + 1}`));
  lines.push('  classDef company fill:#102b42,stroke:#58c5d8,color:#fff');
  companies.forEach(company => lines.push(`  class ${nodeId(company.code)} company`));
  return lines.join('\n');
}
