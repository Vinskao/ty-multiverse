// Mermaid source for the benchmark supply chain: one row per stage, stages stacked top to bottom.
// Companies come from the benchmark API, so the picture follows whichever companies are active.
export type ChainCompany = { code: string; company_name: string; segment: string };

// Taiwan codes stay c2330; overseas record codes keep their letters (NVDA-US -> cNVDA_US) so each one is its own node.
const nodeId = (code: string) => `c${/^\d+$/.test(code) ? code : code.replace(/[^A-Za-z0-9]/g, '_')}`;
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

export type LineupCompany = { code: string; company_name: string; segment: string; role: string };
export type LineupVersion = {
  version: number; name: string; rationale: string; is_current: boolean;
  layers: { key: string; title: string; stages: { title: string; companies: LineupCompany[] }[] }[];
  flows: { from: string; to: string; label: string }[];
  links?: { from: string; to: string; label: string }[];
  terminals?: { key: string; title: string }[];
};

const escapeLabel = (label: string) => label
  .replaceAll('&', '&amp;').replaceAll('"', '#quot;').replaceAll('[', '&#91;').replaceAll(']', '&#93;').replaceAll('|', '/');

// A versioned line-up: one row per layer. Inside a row a plain line joins a stage's leader to its peer,
// and nothing visible joins different stages, because they do not supply each other. Arrows run between rows.
export function lineupDiagram(lineup: LineupVersion): string {
  if (lineup.links?.length) return relationDiagram(lineup);
  const lines = ['flowchart TB'];
  const leaders: string[] = [];
  const peers: string[] = [];
  for (const layer of lineup.layers) {
    lines.push(`  subgraph L_${layer.key}["${escapeLabel(layer.title)}"]`, '    direction LR');
    let previous: string | null = null;
    for (const stage of layer.stages) {
      stage.companies.forEach((company, at) => {
        const id = nodeId(company.code);
        (at === 0 ? leaders : peers).push(id);
        lines.push(`    ${id}["${escapeLabel(`${company.company_name} ${company.code}`)}<br/>${escapeLabel(`${stage.title}・${company.role}`)}"]`);
        if (previous) lines.push(`    ${previous} ${at === 0 ? '~~~' : '---'} ${id}`);
        previous = id;
      });
    }
    lines.push('  end');
  }
  const linked = (a: string, b: string) => lineup.flows.some(flow => (flow.from === a && flow.to === b) || (flow.from === b && flow.to === a));
  // Rows with no arrow between them still have to stack, or Mermaid lays them side by side.
  lineup.layers.slice(1).forEach((layer, at) => {
    const above = lineup.layers[at].key;
    if (!linked(above, layer.key)) lines.push(`  L_${above} ~~~ L_${layer.key}`);
  });
  for (const flow of lineup.flows) lines.push(`  L_${flow.from} -->|${escapeLabel(flow.label)}| L_${flow.to}`);
  lines.push('  classDef leader fill:#14506b,stroke:#7fe0f0,color:#fff', '  classDef peer fill:#102b42,stroke:#58c5d8,color:#fff');
  if (leaders.length) lines.push(`  class ${leaders.join(',')} leader`);
  if (peers.length) lines.push(`  class ${peers.join(',')} peer`);
  return lines.join('\n');
}

// A line-up that names company-to-company relations: every arrow says what one company hands to another,
// which is why each of them matters. Each node carries its stage, so no rows or boxes are needed.
function relationDiagram(lineup: LineupVersion): string {
  const lines = ['flowchart LR'];
  const ids = new Map<string, string>();
  for (const layer of lineup.layers) for (const stage of layer.stages) for (const company of stage.companies) {
    ids.set(company.code, nodeId(company.code));
    lines.push(`  ${nodeId(company.code)}["${escapeLabel(stage.title)}<br/><b>${escapeLabel(`${company.company_name} ${company.code}`)}</b>"]`);
  }
  for (const terminal of lineup.terminals ?? []) {
    ids.set(terminal.key, `t_${terminal.key}`);
    lines.push(`  t_${terminal.key}(["${escapeLabel(terminal.title)}"])`);
  }
  for (const link of lineup.links ?? []) {
    const [from, to] = [ids.get(link.from), ids.get(link.to)];
    if (from && to) lines.push(`  ${from} -->|${escapeLabel(link.label)}| ${to}`);
  }
  lines.push('  classDef leader fill:#14506b,stroke:#7fe0f0,color:#fff');
  const companies = [...ids.values()].filter(id => id.startsWith('c'));
  if (companies.length) lines.push(`  class ${companies.join(',')} leader`);
  return lines.join('\n');
}
