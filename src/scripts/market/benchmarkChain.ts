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
// What a link hands over. Every arrow runs supplier -> customer; the line style says which of these it is.
export const LINK_KINDS = {
  supply: { arrow: '-->', label: '實線：供應材料、設備與元件' },
  manufacture: { arrow: '==>', label: '粗線：代工製造與封裝測試' },
  service: { arrow: '-.->', label: '虛線：設計、工程與驗證服務' },
  product: { arrow: '-->', label: '綠線：產品賣給客戶' },
} as const;
export type LinkKind = keyof typeof LINK_KINDS;

/** The legend entries a line-up actually uses, in LINK_KINDS order; empty for line-ups without kinds. */
export function lineupLegend(lineup: Pick<LineupVersion, 'links'>): { kind: LinkKind; label: string }[] {
  const used = new Set((lineup.links ?? []).map(link => link.kind).filter(Boolean));
  return (Object.keys(LINK_KINDS) as LinkKind[]).filter(kind => used.has(kind)).map(kind => ({ kind, label: LINK_KINDS[kind].label }));
}

export type LineupVersion = {
  version: number; name: string; rationale: string; is_current: boolean;
  layers: { key: string; title: string; stages: { title: string; companies: LineupCompany[] }[] }[];
  flows: { from: string; to: string; label: string }[];
  links?: { from: string; to: string; label: string; kind?: LinkKind }[];
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
  // A link may point at a whole layer (e.g. 創意 sells to the cloud providers as a group): that layer becomes a box.
  const grouped = new Set((lineup.links ?? []).flatMap(link => [link.from, link.to]));
  for (const layer of lineup.layers) {
    const boxed = grouped.has(layer.key);
    if (boxed) {
      ids.set(layer.key, `L_${layer.key}`);
      lines.push(`  subgraph L_${layer.key}["${escapeLabel(layer.title)}"]`);
    }
    for (const stage of layer.stages) for (const company of stage.companies) {
      ids.set(company.code, nodeId(company.code));
      lines.push(`  ${boxed ? '  ' : ''}${nodeId(company.code)}["${escapeLabel(stage.title)}<br/><b>${escapeLabel(`${company.company_name} ${company.code}`)}</b>"]`);
    }
    if (boxed) lines.push('  end');
  }
  for (const terminal of lineup.terminals ?? []) {
    ids.set(terminal.key, `t_${terminal.key}`);
    lines.push(`  t_${terminal.key}(["${escapeLabel(terminal.title)}"])`);
  }
  const productEdges: number[] = [];
  let edge = 0;
  for (const link of lineup.links ?? []) {
    const [from, to] = [ids.get(link.from), ids.get(link.to)];
    if (!from || !to) continue;
    const arrow = link.kind ? LINK_KINDS[link.kind]?.arrow ?? '-->' : '-->';
    lines.push(`  ${from} ${arrow}|${escapeLabel(link.label)}| ${to}`);
    if (link.kind === 'product') productEdges.push(edge);
    edge += 1;
  }
  if (productEdges.length) lines.push(`  linkStyle ${productEdges.join(',')} stroke:#3fb950,stroke-width:2px`);
  lines.push('  classDef leader fill:#14506b,stroke:#7fe0f0,color:#fff');
  const companies = [...ids.values()].filter(id => id.startsWith('c'));
  if (companies.length) lines.push(`  class ${companies.join(',')} leader`);
  return lines.join('\n');
}
