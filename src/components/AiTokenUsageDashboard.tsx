import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { aiUsageService, type AiTokenUsageSummary, type AiUsageSummaryResponse } from '../services/api/aiUsageService';

const PROVIDER_COLORS: Record<string, string> = {
  codex: '#10a37f',
  claude: '#d97757',
  gemini: '#4285f4',
};

const PROVIDER_LABELS: Record<string, string> = {
  codex: 'Codex',
  claude: 'Claude',
  gemini: 'Gemini',
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

const styles = {
  wrapper: {
    fontFamily: 'var(--font-body)',
    color: 'var(--gray-0)',
  } as React.CSSProperties,

  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: '1rem',
    marginBottom: '1.25rem',
  },

  title: {
    fontSize: 'var(--text-md)',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    color: 'var(--accent-light)',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },

  kpiRow: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
  },

  kpiCard: {
    background: 'linear-gradient(135deg, rgba(37,81,135,0.18) 0%, rgba(97,246,234,0.06) 100%)',
    border: '1px solid rgba(97,246,234,0.18)',
    borderRadius: '10px',
    padding: '0.85rem 1.25rem',
    minWidth: '130px',
    flex: '1',
  } as React.CSSProperties,

  kpiLabel: {
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--accent-light)',
    marginBottom: '0.3rem',
    opacity: 0.85,
  },

  kpiValue: {
    fontSize: '1.6rem',
    fontWeight: 700,
    lineHeight: 1,
    color: 'var(--gray-0)',
  },

  panel: {
    background: 'rgba(20,25,37,0.6)',
    border: '1px solid rgba(97,246,234,0.10)',
    borderRadius: '10px',
    padding: '1rem 1.25rem',
  } as React.CSSProperties,

  panelLabel: {
    fontSize: '0.72rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--accent-light)',
    marginBottom: '0.75rem',
    opacity: 0.7,
  },

  legendDot: (color: string) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    display: 'inline-block',
    flexShrink: 0,
  } as React.CSSProperties),

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.82rem',
  },

  th: {
    padding: '6px 10px',
    textAlign: 'left' as const,
    fontWeight: 600,
    fontSize: '0.7rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: 'var(--accent-light)',
    opacity: 0.75,
    borderBottom: '1px solid rgba(97,246,234,0.12)',
  },

  td: {
    padding: '7px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: 'var(--gray-0)',
  },

  providerBadge: (color: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '2px 8px',
    borderRadius: '20px',
    fontSize: '0.72rem',
    fontWeight: 600,
    background: `${color}22`,
    border: `1px solid ${color}55`,
    color: color,
  } as React.CSSProperties),
};

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{value}</div>
    </div>
  );
}

function drawLineChart(svg: SVGSVGElement, data: AiTokenUsageSummary[]) {
  const el = d3.select(svg);
  el.selectAll('*').remove();

  const width = svg.clientWidth || 600;
  const height = 180;
  const margin = { top: 12, right: 16, bottom: 28, left: 52 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const grouped = d3.group(data, (d) => d.aiProvider);
  const allDates = [...new Set(data.map((d) => d.period))].sort();
  const xScale = d3.scalePoint<string>().domain(allDates).range([0, innerW]).padding(0.1);
  const yMax = d3.max(data, (d) => d.totalTokens) ?? 1;
  const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).range([innerH, 0]);

  const g = el.attr('height', height).append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Grid lines
  g.append('g')
    .attr('class', 'grid')
    .call(
      d3.axisLeft(yScale).ticks(4)
        .tickSize(-innerW)
        .tickFormat(() => '')
    )
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('.tick line').attr('stroke', 'rgba(97,246,234,0.07)'));

  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(
      d3.axisBottom(xScale)
        .tickValues(allDates.filter((_, i) => i % Math.ceil(allDates.length / 6) === 0))
    )
    .call((g) => g.select('.domain').attr('stroke', 'rgba(255,255,255,0.1)'))
    .call((g) => g.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.1)'))
    .selectAll('text')
    .attr('font-size', 9)
    .attr('fill', 'rgba(255,255,255,0.45)');

  g.append('g')
    .call(d3.axisLeft(yScale).ticks(4).tickFormat((v) => formatTokens(Number(v))))
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('.tick line').remove())
    .selectAll('text')
    .attr('font-size', 9)
    .attr('fill', 'rgba(255,255,255,0.45)');

  const lineGen = d3.line<AiTokenUsageSummary>()
    .x((d) => xScale(d.period) ?? 0)
    .y((d) => yScale(d.totalTokens))
    .curve(d3.curveMonotoneX);

  for (const [provider, rows] of grouped) {
    const sorted = [...rows].sort((a, b) => a.period.localeCompare(b.period));
    const color = getProviderColor(provider);

    // Area fill
    const areaGen = d3.area<AiTokenUsageSummary>()
      .x((d) => xScale(d.period) ?? 0)
      .y0(innerH)
      .y1((d) => yScale(d.totalTokens))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(sorted)
      .attr('fill', `${color}18`)
      .attr('d', areaGen);

    g.append('path')
      .datum(sorted)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('d', lineGen);

    // Dots
    g.selectAll(`.dot-${provider}`)
      .data(sorted)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.period) ?? 0)
      .attr('cy', (d) => yScale(d.totalTokens))
      .attr('r', 3)
      .attr('fill', color)
      .attr('stroke', '#141925')
      .attr('stroke-width', 1.5);
  }
}

export default function AiTokenUsageDashboard() {
  const [summary, setSummary] = useState<AiUsageSummaryResponse | null>(null);
  const [daily, setDaily] = useState<AiTokenUsageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadUsage() {
      try {
        const s = await aiUsageService.getSummary();
        const d = await aiUsageService.getDailySummary(30);
        if (!cancelled) { setSummary(s); setDaily(d); }
      } catch (e) {
        console.error('AI usage fetch error', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadUsage();
    return () => { cancelled = true; };
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
    return (
      <div style={{ padding: '1.5rem', color: 'var(--accent-light)', opacity: 0.6, fontSize: '0.85rem', letterSpacing: '0.06em' }}>
        載入中…
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* Top bar: title + KPIs */}
      <div style={styles.topBar}>
        <h2 style={styles.title}>
          <span style={{ fontSize: '1.1em' }}>⚡</span>
          AI Token Usage
        </h2>
        <div style={styles.kpiRow}>
          <KpiCard label="Today" value={formatTokens(todayTokens)} />
          <KpiCard label="This Month" value={formatTokens(monthTokens)} />
          <KpiCard label="Est. Cost" value={formatCost(monthCost)} />
        </div>
      </div>

      {/* Chart + breakdown row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'start' }}>
        {/* Line chart */}
        <div style={styles.panel}>
          <div style={styles.panelLabel}>Daily Token Usage — Last 30 Days</div>
          {daily.length === 0
            ? <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No data</div>
            : <svg ref={svgRef} style={{ width: '100%', display: 'block' }} />
          }
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {Object.entries(PROVIDER_COLORS).map(([p, c]) => (
              <span key={p} style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.8 }}>
                <span style={styles.legendDot(c)} />
                {PROVIDER_LABELS[p] ?? p}
              </span>
            ))}
          </div>
        </div>

        {/* Provider breakdown table */}
        <div style={{ ...styles.panel, minWidth: '280px', overflowX: 'auto' }}>
          <div style={styles.panelLabel}>Provider / Model</div>
          {byProvider.size === 0
            ? <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No data</div>
            : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Provider', 'Model', 'Calls', 'Tokens', 'Cost'].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...byProvider.entries()].flatMap(([provider, models]) =>
                    [...models.entries()].map(([model, stats]) => (
                      <tr key={`${provider}-${model}`}>
                        <td style={styles.td}>
                          <span style={styles.providerBadge(getProviderColor(provider))}>
                            {PROVIDER_LABELS[provider.toLowerCase()] ?? provider}
                          </span>
                        </td>
                        <td style={{ ...styles.td, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>{model}</td>
                        <td style={{ ...styles.td, textAlign: 'right' as const }}>{stats.calls.toLocaleString()}</td>
                        <td style={{ ...styles.td, textAlign: 'right' as const, color: 'var(--accent-light)' }}>{formatTokens(stats.totalTokens)}</td>
                        <td style={{ ...styles.td, textAlign: 'right' as const, opacity: 0.7 }}>{formatCost(stats.totalCost)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )
          }
        </div>
      </div>
    </div>
  );
}
