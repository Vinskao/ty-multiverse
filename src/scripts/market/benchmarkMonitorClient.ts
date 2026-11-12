import { formatNumber } from '../format/numbers';
import { monitorDiagram, type BenchmarkMonitor } from './benchmarkMonitor';
import type { LineupVersion } from './benchmarkChain';

export function initBenchmarkMonitor(doc: Document = document): void {
  const root = doc.querySelector<HTMLElement>('#benchmark[data-lineup]');
  if (!root?.dataset.lineup || root.dataset.monitorBound) return;
  root.dataset.monitorBound = 'true';
  const lineup: LineupVersion = JSON.parse(root.dataset.lineup);
  const select = root.querySelector<HTMLSelectElement>('[data-benchmark-evidence]');
  const readout = root.querySelector<HTMLElement>('[data-benchmark-readout]');
  const status = root.querySelector<HTMLElement>('[data-benchmark-status]');
  let snapshot: BenchmarkMonitor | null = null;
  let pending = false;
  let stopped = false;
  const renderEvidence = () => {
    if (!readout || !select) return;
    const node = snapshot?.nodes.find(item => item.code === select.value);
    readout.replaceChildren();
    const paragraph = (value: string) => {
      const element = doc.createElement('p');
      element.textContent = value;
      readout.append(element);
    };
    if (!node?.claims?.length) paragraph('尚無最新年報的已審核主張，不判為中性或順風。');
    for (const claim of node?.claims ?? []) {
      paragraph(`${claim.year} 年報，第 ${claim.page} 頁：${claim.claim}`);
      paragraph(claim.evidence);
      if (claim.source?.startsWith('https://')) {
        const link = doc.createElement('a');
        link.href = claim.source;
        link.textContent = '查閱原始年報';
        readout.append(link);
      }
    }
    if (!node?.validation?.checks?.length) paragraph('尚無已審核驗證條件，順逆風占比暫不計算。');
    for (const check of node?.validation?.checks ?? []) {
      const labels: Record<string, string> = { 'monthly.yoyPercent': '月營收年增率',
        'quarterly.revenueYoYPercent': '季營收年增率', 'quarterly.grossMarginPercent': '毛利率',
        'quarterly.grossMarginYoYPp': '毛利率年變動', 'quarterly.operatingMarginPercent': '營業利益率' };
      const kind = check.metric.endsWith('Pp') ? 'pp' : 'percent';
      const outcome = { support: '符合條件', headwind: '不符條件', unknown: '資料不足或過期' }[check.outcome] ?? '未知';
      paragraph(`${check.code}・${labels[check.metric] ?? check.metric}・${check.period ?? '缺期別'}：${formatNumber(check.value, kind)}，門檻 ${formatNumber(check.threshold, kind)}。${check.rationale}。${check.source ?? '缺來源'}。${outcome}`);
    }
  };
  select?.addEventListener('change', renderEvidence);
  const refresh = async () => {
    if (pending || stopped || doc.hidden) return;
    pending = true;
    try {
      const response = await fetch('/api/market/benchmark/monitor', { cache: 'no-store', signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('Monitor unavailable');
      const next: BenchmarkMonitor = await response.json();
      if (stopped) return;
      if (next.revision !== snapshot?.revision) {
        snapshot = next;
        const panel = root.querySelector<HTMLDetailsElement>('details.overview');
        const old = panel?.querySelector('pre.mermaid');
        if (old && panel) {
          const pre = doc.createElement('pre');
          pre.className = 'mermaid';
          pre.textContent = monitorDiagram(lineup, next);
          old.replaceWith(pre);
          panel.dispatchEvent(new Event('toggle'));
        }
        renderEvidence();
      }
      if (status) status.textContent = `持股快照：${next.holdingsSnapshotAt ?? '尚無'}。資料變更時自動重算，畫面每分鐘檢查。`;
    } catch {
      if (!stopped && status) status.textContent = '風向更新失敗，圖上保留前次資料，請勿視為最新。';
    } finally { pending = false; }
  };
  const timer = setInterval(() => { void refresh(); }, 60000);
  doc.addEventListener('astro:before-swap', () => { stopped = true; clearInterval(timer); }, { once: true });
  void refresh();
}
