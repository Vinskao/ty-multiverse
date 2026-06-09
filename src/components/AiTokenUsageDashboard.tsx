import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { aiUsageService, type AiTokenUsageSummary, type AiUsageSummaryResponse } from '../services/api/aiUsageService';

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10a37f',
  gemini: '#4285f4',
  qwen: '#ff6a00',
};

function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider.toLowerCase()] ?? '#888';
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(n: number): string {
  return `$${(n ?? 0).toFixed(4)}`;
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      border: '1px solid var(--gray-800, #333)',
      borderRadius: '8px',
      padding: '1.5rem',
      flex: '1',
      minWidth: '160px',
    }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--gray-400, #999)', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function drawLineChart(svg: SVGSVGElement, data: AiTokenUsageSummary[]) {
  const el = d3.select(svg);
  el.selectAll('*').remove();

  const width = svg.clientWidth || 600;
  const height = 200;
  const margin = { top: 16, right: 16, bottom: 32, left: 56 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const grouped = d3.group(data, (d) => d.aiProvider);

  const allDates = [...new Set(data.map((d) => d.period))].sort();
  const xScale = d3.scalePoint<string>().domain(allDates).range([0, innerW]).padding(0.1);
  const yMax = d3.max(data, (d) => d.totalTokens) ?? 1;
  const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).range([innerH, 0]);

  const g = el.attr('height', height).append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  g.append('g').attr('transform', `translate(0,${innerH})`).call(
    d3.axisBottom(xScale).tickValues(allDates.filter((_, i) => i % Math.ceil(allDates.length / 6) === 0))
  ).selectAll('text').attr('font-size', 10);

  g.append('g').call(d3.axisLeft(yScale).ticks(4).tickFormat((v) => formatTokens(Number(v))))
    .selectAll('text').attr('font-size', 10);

  const lineGen = d3.line<AiTokenUsageSummary>()
    .x((d) => xScale(d.period) ?? 0)
    .y((d) => yScale(d.totalTokens))
    .curve(d3.curveMonotoneX);

  for (const [provider, rows] of grouped) {
    const sorted = [...rows].sort((a, b) => a.period.localeCompare(b.period));
    g.append('path')
      .datum(sorted)
      .attr('fill', 'none')
      .attr('stroke', getProviderColor(provider))
      .attr('stroke-width', 2)
      .attr('d', lineGen);
  }
}

export default function AiTokenUsageDashboard() {
  const [summary, setSummary] = useState<AiUsageSummaryResponse | null>(null);
  const [daily, setDaily] = useState<AiTokenUsageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    Promise.all([
      aiUsageService.getSummary(),
      aiUsageService.getDailySummary(30),
    ])
      .then(([s, d]) => { setSummary(s); setDaily(d); })
      .catch((e) => console.error('AI usage fetch error', e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!svgRef.current || daily.length === 0) return;
    drawLineChart(svgRef.current, daily);
  }, [daily]);

  const todayTokens = summary?.today.reduce((acc, r) => acc + (r.totalTokens ?? 0), 0) ?? 0;
  const monthTokens = summary?.thisMonth.reduce((acc, r) => acc + (r.totalTokens ?? 0), 0) ?? 0;
  const monthCost = summary?.thisMonth.reduce((acc, r) => acc + (r.totalEstimatedCostUsd ?? 0), 0) ?? 0;

  const byProvider = d3.rollup(
    daily,
    (rows) => ({
      totalTokens: d3.sum(rows, (r) => r.totalTokens),
      totalCost: d3.sum(rows, (r) => r.totalEstimatedCostUsd),
      calls: d3.sum(rows, (r) => r.callCount),
    }),
    (r) => r.aiProvider,
    (r) => r.modelName,
  );

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--gray-400, #999)' }}>載入中…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <KpiCard label="今日 Tokens" value={formatTokens(todayTokens)} />
        <KpiCard label="本月 Tokens" value={formatTokens(monthTokens)} />
        <KpiCard label="本月估算費用" value={formatCost(monthCost)} />
      </div>

      <div style={{ border: '1px solid var(--gray-800, #333)', borderRadius: '8px', padding: '1rem' }}>
        <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--gray-400, #999)' }}>近 30 天每日 Token 用量</div>
        {daily.length === 0
          ? <div style={{ color: 'var(--gray-400, #999)', fontSize: '0.9rem' }}>尚無資料</div>
          : <svg ref={svgRef} style={{ width: '100%', display: 'block' }} />
        }
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {Object.entries(PROVIDER_COLORS).map(([p, c]) => (
            <span key={p} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
              {p}
            </span>
          ))}
        </div>
      </div>

      <div style={{ border: '1px solid var(--gray-800, #333)', borderRadius: '8px', padding: '1rem', overflowX: 'auto' }}>
        <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--gray-400, #999)' }}>近 30 天按 Provider / Model 統計</div>
        {byProvider.size === 0
          ? <div style={{ color: 'var(--gray-400, #999)', fontSize: '0.9rem' }}>尚無資料</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--gray-800, #333)' }}>
                  {['Provider', 'Model', 'Calls', 'Tokens', '估算費用 (USD)'].map((h) => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...byProvider.entries()].flatMap(([provider, models]) =>
                  [...models.entries()].map(([model, stats]) => (
                    <tr key={`${provider}-${model}`} style={{ borderBottom: '1px solid var(--gray-900, #222)' }}>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: getProviderColor(provider), display: 'inline-block' }} />
                          {provider}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px' }}>{model}</td>
                      <td style={{ padding: '6px 8px' }}>{stats.calls.toLocaleString()}</td>
                      <td style={{ padding: '6px 8px' }}>{formatTokens(stats.totalTokens)}</td>
                      <td style={{ padding: '6px 8px' }}>{formatCost(stats.totalCost)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}
