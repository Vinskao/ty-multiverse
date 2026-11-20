import { formatNumber } from '../format/numbers';
import { getMermaidConfig } from '../mermaid-theme';
import { loadFromCdn } from './benchmarkDiagram';
import type { MarketReport } from './reports';
import type { ReportRecency } from './reportStats';

const DIRECTIONS = {
  tailwind: ['Tailwind', '順風'],
  headwind: ['Headwind', '逆風'],
  neutral: ['Neutral', '中性'],
} as const;
type Direction = keyof typeof DIRECTIONS;
const directions = Object.keys(DIRECTIONS) as Direction[];
const REASONS = {
  undated: ['Publication date unavailable', '缺少發布日期'],
  future: ['Future publication date', '發布日期尚未到'],
  'no-cutoff': ['No prior fiscal-year annual report', '缺少去年財年年報基準'],
  'before-cutoff': ['Before the annual-report cutoff', '早於年報基準日'],
} as const;

export function reportClaimsDetails(
  reports: readonly MarketReport[], weights: ReadonlyMap<string, ReportRecency>, zh: boolean, load = loadFromCdn,
): HTMLDetailsElement {
  const locale = zh ? 1 : 0;
  const groupedClaims = reports.flatMap((report) => (report.claims ?? []).map((claim) => ({
    claim, recency: weights.get(report.id), publishedAt: report.published_at,
  })));
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  const count = formatNumber(groupedClaims.length, 'count');
  summary.textContent = zh ? `報告主張（${count}）` : `Report claims (${count})`;

  const graph = document.createElement('details');
  graph.className = 'market-report-claims-graph';
  const graphTitle = document.createElement('summary');
  graphTitle.textContent = zh ? '主張方向圖' : 'Claim direction diagram';
  graph.append(graphTitle);
  const counts = directions.map((direction) => {
    const items = groupedClaims.filter(({ claim }) => claim.direction === direction);
    const total = items.reduce((sum, { recency }) => sum + (recency?.weight ?? 0), 0);
    return `${DIRECTIONS[direction][locale]} · ${formatNumber(items.length, 'count')} · ${direction === 'neutral' ? '—' : formatNumber(total, 'decimal')}`;
  });
  graph.addEventListener('toggle', async () => {
    if (!graph.open || graph.querySelector('pre') || graph.getAttribute('aria-busy') === 'true') return;
    graph.setAttribute('aria-busy', 'true');
    const status = document.createElement('p');
    status.className = 'market-report-graph-loading';
    status.setAttribute('role', 'status');
    status.textContent = zh ? '載入方向圖中…' : 'Loading diagram…';
    graph.append(status);
    const pre = document.createElement('pre');
    // The graph uses only fixed labels and computed numbers. Full claims stay in the text list.
    const root = zh ? '主張方向 · 筆數 · 加權合計' : 'Direction · Count · Weighted total';
    pre.textContent = [`flowchart TD`, `  R["${root}"]`, ...counts.map((label, index) => `  R --> D${index}["${label}"]`)].join('\n');
    try {
      const mermaid = await load();
      if (!graph.isConnected) return;
      mermaid.initialize({ ...getMermaidConfig(document.documentElement.classList.contains('theme-dark')), securityLevel: 'strict' });
      graph.append(pre);
      await mermaid.run({ nodes: [pre] });
    } catch {
      pre.remove();
      const error = document.createElement('p');
      error.textContent = zh ? '暫時無法載入方向圖。關閉後重開可重試。' : 'Diagram unavailable. Close and reopen to retry.';
      graph.append(error);
      graph.addEventListener('toggle', () => error.remove(), { once: true });
    } finally {
      status.remove();
      graph.removeAttribute('aria-busy');
    }
  });

  const filterLabel = document.createElement('label');
  filterLabel.className = 'market-report-direction';
  filterLabel.textContent = zh ? '主張方向' : 'Claim direction';
  const filter = document.createElement('select');
  filter.append(new Option(zh ? '全部' : 'All', 'all'));
  for (const direction of directions) filter.append(new Option(DIRECTIONS[direction][locale], direction));
  filterLabel.append(filter);
  const list = document.createElement('div');
  const drawList = () => {
    list.replaceChildren();
    const groups = new Map<string, HTMLElement>();
    for (const { claim, recency, publishedAt } of groupedClaims) {
      if (filter.value !== 'all' && filter.value !== claim.direction) continue;
      let group = groups.get(claim.segment);
      if (!group) {
        group = document.createElement('section');
        const heading = document.createElement('h6');
        heading.textContent = claim.segment;
        group.append(heading);
        groups.set(claim.segment, group);
        list.append(group);
      }
      const item = document.createElement('div');
      item.className = 'market-report-claim';
      const text = document.createElement('div');
      text.textContent = `${DIRECTIONS[claim.direction][locale]} · p.${formatNumber(claim.page, 'count')}｜${claim.claim}`;
      const meta = document.createElement('small');
      const weight = `${formatNumber(recency?.weight ?? 0, 'decimal')}×`;
      const age = recency?.ageDays != null && recency.ageDays >= 0
        ? (zh ? `${formatNumber(recency.ageDays, 'count')} 天前` : `${formatNumber(recency.ageDays, 'count')} days old`) : null;
      const factor = !recency ? (zh ? '未納入公開排行' : 'Outside the public ranking')
        : claim.direction === 'neutral' ? (zh ? '中性不計入順逆風比例' : 'Neutral excluded from direction share')
        : (zh ? `時效權重 ${weight}` : `Recency weight ${weight}`);
      const reason = claim.direction !== 'neutral' && recency?.reason
        ? [REASONS[recency.reason][locale], recency.reason === 'before-cutoff' ? recency.cutoffDate : null].filter(Boolean).join(' ')
        : null;
      meta.textContent = [publishedAt, age, factor, reason].filter(Boolean).join(' · ');
      item.append(text, meta);
      group.append(item);
    }
  };
  filter.onchange = drawList;
  details.append(summary, graph, filterLabel, list);
  details.addEventListener('toggle', () => { if (details.open && !list.childElementCount) drawList(); });
  return details;
}
