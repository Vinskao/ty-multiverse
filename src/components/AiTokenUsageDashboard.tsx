import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  aiUsageService,
  type AiTokenUsageOverview,
  type AiTokenUsageSummary,
} from '../services/api/aiUsageService';

const PROVIDER_COLORS: Record<string, string> = {
  codex: '#00D084',    // OpenAI - 亮綠
  'claude-code': '#FF6B35',    // Claude - 亮橙紅
  'claude': '#FF6B35',
  gemini: '#4F46E5',   // Gemini - 飽和藍
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

function formatGrowth(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function parseOverviewDate(value: unknown): Date | null {
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day] = value.map(Number);
    return new Date(year, month - 1, day);
  }
  if (typeof value === 'string' && value) {
    return new Date(`${value}T00:00:00`);
  }
  return null;
}

function daysSince(value: unknown): number {
  const since = parseOverviewDate(value);
  if (!since || Number.isNaN(since.getTime())) return 3650;
  const today = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((today.getTime() - since.getTime()) / msPerDay) + 1);
}

function getWeekKey(period: string): string {
  return d3.timeMonday.floor(new Date(`${period}T00:00:00`)).toISOString();
}

function trailingGrowthFromDaily(data: AiTokenUsageSummary[], days: number): number | null {
  if (data.length === 0) return null;
  const dates = data.map((row) => new Date(`${row.period}T00:00:00`).getTime());
  const anchor = new Date(Math.max(...dates));
  anchor.setDate(anchor.getDate() + 1);

  const currentStart = new Date(anchor);
  currentStart.setDate(currentStart.getDate() - days);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - days);

  const sumTokens = (from: Date, to: Date) => d3.sum(
    data.filter((row) => {
      const day = new Date(`${row.period}T00:00:00`);
      return day >= from && day < to;
    }),
    (row) => row.totalTokens,
  );

  const current = sumTokens(currentStart, anchor);
  const previous = sumTokens(previousStart, currentStart);
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
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
    color: '#61F6EA',
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
    background: 'linear-gradient(135deg, rgba(79,70,229,0.25) 0%, rgba(79,70,229,0.12) 100%)',
    border: '2px solid rgba(79,70,229,0.6)',
    borderRadius: '12px',
    padding: '1rem 1.5rem',
    minWidth: '140px',
    flex: '1',
    boxShadow: '0 4px 16px rgba(79,70,229,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
  } as React.CSSProperties,

  kpiLabel: {
    fontSize: '0.7rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#61F6EA',
    marginBottom: '0.5rem',
    opacity: 1,
  },

  kpiValue: {
    fontSize: '1.8rem',
    fontWeight: 700,
    lineHeight: 1,
    color: '#FFFFFF',
    letterSpacing: '-0.02em',
  },

  panel: {
    background: 'rgba(20,25,37,0.85)',
    border: '1.5px solid rgba(79,70,229,0.5)',
    borderRadius: '12px',
    padding: '1.25rem 1.5rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
  } as React.CSSProperties,

  panelLabel: {
    fontSize: '0.72rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#61F6EA',
    marginBottom: '0.75rem',
    opacity: 1,
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
    color: '#61F6EA',
    opacity: 1,
    borderBottom: '2px solid rgba(79,70,229,0.5)',
  },

  td: {
    padding: '7px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: '#E0E0E0',
    fontSize: '0.9rem',
  },

  providerBadge: (color: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.72rem',
    fontWeight: 600,
    background: `${color}20`,
    border: `1.5px solid ${color}`,
    color: color,
  } as React.CSSProperties),

  rangeControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    margin: '-0.25rem 0 0.75rem',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,

  rangeInput: {
    flex: 1,
    minWidth: '180px',
    accentColor: '#61F6EA',
  } as React.CSSProperties,

  rangeValue: {
    fontSize: '0.72rem',
    color: '#FFD700',
    fontWeight: 700,
    minWidth: '72px',
    textAlign: 'right' as const,
  } as React.CSSProperties,
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
    .call((g) => g.selectAll('.tick line').attr('stroke', 'rgba(79,70,229,0.15)'));

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

function drawWeeklyCostChart(svg: SVGSVGElement, data: AiTokenUsageSummary[]) {
  const el = d3.select(svg);
  el.selectAll('*').remove();

  const width = svg.clientWidth || 600;
  const height = 195;
  const margin = { top: 12, right: 16, bottom: 54, left: 52 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const weekCost = Array.from(
    d3.rollup(
      data,
      (rows) => d3.sum(rows, (r) => r.totalEstimatedCostUsd),
      (r) => d3.timeMonday.floor(new Date(`${r.period}T00:00:00`)).toISOString(),
    ),
    ([weekStartIso, cost]) => {
      const weekStart = new Date(weekStartIso);
      return {
        weekStart,
        period: d3.timeFormat('%m/%d')(weekStart),
        month: d3.timeFormat('%Y-%m')(weekStart),
        cost,
      };
    },
  ).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

  const monthColors = d3.scaleOrdinal<string, string>()
    .domain([...new Set(weekCost.map((d) => d.month))])
    .range(['#FFD700', '#61F6EA', '#FF6B35', '#00D084', '#A78BFA', '#F472B6']);

  const xScale = d3.scalePoint<string>()
    .domain(weekCost.map((d) => d.period))
    .range([0, innerW])
    .padding(0.35);
  const yMax = d3.max(weekCost, (d) => d.cost) ?? 1;
  const yScale = d3.scaleLinear().domain([0, yMax * 1.15]).range([innerH, 0]);

  const g = el.attr('height', height).append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  g.append('g')
    .call(d3.axisLeft(yScale).ticks(4).tickSize(-innerW).tickFormat(() => ''))
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('.tick line').attr('stroke', 'rgba(255,215,0,0.14)'));

  g.append('g')
    .attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale))
    .call((g) => g.select('.domain').attr('stroke', 'rgba(255,255,255,0.1)'))
    .call((g) => g.selectAll('.tick line').attr('stroke', 'rgba(255,255,255,0.1)'))
    .selectAll('text')
    .attr('font-size', 9)
    .attr('fill', 'rgba(255,255,255,0.45)');

  g.append('g')
    .call(d3.axisLeft(yScale).ticks(4).tickFormat((v) => `$${Number(v).toFixed(0)}`))
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('.tick line').remove())
    .selectAll('text')
    .attr('font-size', 9)
    .attr('fill', 'rgba(255,255,255,0.45)');

  const segmentLine = d3.line<{ period: string; cost: number }>()
    .x((d) => xScale(d.period) ?? 0)
    .y((d) => yScale(d.cost))
    .curve(d3.curveLinear);

  const segmentArea = d3.area<{ period: string; cost: number }>()
    .x((d) => xScale(d.period) ?? 0)
    .y0(innerH)
    .y1((d) => yScale(d.cost))
    .curve(d3.curveLinear);

  for (let i = 1; i < weekCost.length; i += 1) {
    const segment = [weekCost[i - 1], weekCost[i]];
    const color = monthColors(weekCost[i].month);
    g.append('path').datum(segment).attr('fill', `${color}18`).attr('d', segmentArea);
    g.append('path').datum(segment).attr('fill', 'none').attr('stroke', color).attr('stroke-width', 2).attr('d', segmentLine);
  }

  g.selectAll('.weekly-cost-dot')
    .data(weekCost)
    .enter()
    .append('circle')
    .attr('class', 'weekly-cost-dot')
    .attr('cx', (d) => xScale(d.period) ?? 0)
    .attr('cy', (d) => yScale(d.cost))
    .attr('r', 3.5)
    .attr('fill', (d) => monthColors(d.month))
    .attr('stroke', '#141925')
    .attr('stroke-width', 1.5);

  const legend = g.append('g').attr('transform', `translate(0,${innerH + 34})`);
  const months = monthColors.domain();
  legend.selectAll('g')
    .data(months)
    .enter()
    .append('g')
    .attr('transform', (_, i) => `translate(${i * 86},0)`)
    .call((group) => {
      group.append('circle').attr('r', 4).attr('fill', (d) => monthColors(d));
      group.append('text')
        .attr('x', 10)
        .attr('y', 4)
        .attr('font-size', 10)
        .attr('fill', 'rgba(255,255,255,0.68)')
        .text((d) => d);
    });
}

export default function AiTokenUsageDashboard() {
  const [overview, setOverview] = useState<AiTokenUsageOverview | null>(null);
  const [daily, setDaily] = useState<AiTokenUsageSummary[]>([]);
  const [visibleWeeks, setVisibleWeeks] = useState(0);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const weeklyCostSvgRef = useRef<SVGSVGElement>(null);
  const linePanelRef = useRef<HTMLDivElement>(null);
  const weeklyPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadUsage() {
      try {
        const overviewResult = await aiUsageService.getOverview();
        const dailyResult = await aiUsageService.getDailySummary(daysSince(overviewResult.dataSince));
        if (!cancelled) {
          setOverview(overviewResult);
          setDaily(dailyResult);
        }
      } catch (e) {
        console.error('AI usage fetch error', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadUsage();
    return () => { cancelled = true; };
  }, []);

  const allWeekKeys = [...new Set(daily.map((row) => getWeekKey(row.period)))].sort();
  const selectedWeeks = visibleWeeks || allWeekKeys.length;
  const visibleWeekKeys = new Set(allWeekKeys.slice(Math.max(0, allWeekKeys.length - selectedWeeks)));
  const weeklyTrendDaily = daily.filter((row) => visibleWeekKeys.has(getWeekKey(row.period)));
  const selectedRangeLabel = selectedWeeks === allWeekKeys.length ? 'All weeks' : `Last ${selectedWeeks} weeks`;

  useEffect(() => {
    if (allWeekKeys.length === 0) return;
    setVisibleWeeks((current) => {
      if (current === 0 || current > allWeekKeys.length) return allWeekKeys.length;
      return current;
    });
  }, [allWeekKeys.length]);

  const chartDaily = Array.from(
    d3.rollup(
      weeklyTrendDaily,
      (rows) => ({
        ...rows[0],
        modelName: 'all',
        totalInputTokens: d3.sum(rows, (r) => r.totalInputTokens),
        totalOutputTokens: d3.sum(rows, (r) => r.totalOutputTokens),
        totalTokens: d3.sum(rows, (r) => r.totalTokens),
        totalEstimatedCostUsd: d3.sum(rows, (r) => r.totalEstimatedCostUsd),
        callCount: d3.sum(rows, (r) => r.callCount),
      }),
      (r) => r.period,
      (r) => r.aiProvider,
    ).values()
  ).flatMap((providers) => Array.from(providers.values()));

  useEffect(() => {
    if (!svgRef.current || chartDaily.length === 0) return;
    drawLineChart(svgRef.current, chartDaily);
  }, [chartDaily]);

  useEffect(() => {
    if (!weeklyCostSvgRef.current || weeklyTrendDaily.length === 0) return;
    drawWeeklyCostChart(weeklyCostSvgRef.current, weeklyTrendDaily);
  }, [weeklyTrendDaily]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;

    const redraw = () => {
      if (svgRef.current && chartDaily.length > 0) {
        drawLineChart(svgRef.current, chartDaily);
      }
      if (weeklyCostSvgRef.current && weeklyTrendDaily.length > 0) {
        drawWeeklyCostChart(weeklyCostSvgRef.current, weeklyTrendDaily);
      }
    };

    const observers: ResizeObserver[] = [];
    for (const el of [linePanelRef.current, weeklyPanelRef.current]) {
      if (!el) continue;
      const observer = new ResizeObserver(() => redraw());
      observer.observe(el);
      observers.push(observer);
    }

    window.addEventListener('resize', redraw);
    return () => {
      window.removeEventListener('resize', redraw);
      observers.forEach((observer) => observer.disconnect());
    };
  }, [chartDaily, weeklyTrendDaily]);

  const byProvider = d3.rollup(
    weeklyTrendDaily,
    (rows) => ({
      totalTokens: d3.sum(rows, (r) => r.totalTokens),
      totalCost: d3.sum(rows, (r) => r.totalEstimatedCostUsd),
      calls: d3.sum(rows, (r) => r.callCount),
    }),
    (r) => r.aiProvider,
    (r) => r.modelName,
  );
  const trailingWow = trailingGrowthFromDaily(daily, 7);
  const trailingMom = trailingGrowthFromDaily(daily, 30);
  const trailingYoy = trailingGrowthFromDaily(daily, 365);

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
          <span style={{ fontSize: '1.1em' }}></span>
          AI Token Usage
        </h2>
        <div style={styles.kpiRow}>
          <KpiCard label="本月用量" value={formatTokens(overview?.thisMonth ?? 0)} />
          <KpiCard label="上月用量" value={formatTokens(overview?.lastMonth ?? 0)} />
          <KpiCard label="本年用量" value={formatTokens(overview?.thisYear ?? 0)} />
          <KpiCard label="可觀測總用量" value={formatTokens(overview?.observableTotal ?? 0)} />
          <KpiCard label="日均" value={formatTokens(overview?.dailyAverage ?? 0)} />
          <KpiCard label="月均" value={formatTokens(overview?.monthlyAverage ?? 0)} />
          <KpiCard label="年均" value={formatTokens(overview?.yearlyAverage ?? 0)} />
          <KpiCard label="Trailing WoW" value={formatGrowth(trailingWow ?? overview?.wowPercent)} />
          <KpiCard label="Trailing MoM" value={formatGrowth(trailingMom ?? overview?.momPercent)} />
          <KpiCard label="Trailing YoY" value={formatGrowth(trailingYoy ?? overview?.yoyPercent)} />
        </div>
      </div>
      {overview?.dataSince && (
        <div style={{ fontSize: '0.7rem', opacity: 0.55, margin: '-0.75rem 0 1rem' }}>
          統計起始：{overview.dataSince} · 時區：{overview.timezone}
        </div>
      )}

      <div ref={weeklyPanelRef} style={{ ...styles.panel, marginBottom: '0.75rem' }}>
        <div style={styles.panelLabel}>Weekly Cost Trend</div>
        {allWeekKeys.length > 0 && (
          <div style={styles.rangeControl}>
            <input
              aria-label="Weekly cost visible weeks"
              type="range"
              min={1}
              max={allWeekKeys.length}
              value={selectedWeeks}
              onChange={(event) => setVisibleWeeks(Number(event.currentTarget.value))}
              style={styles.rangeInput}
            />
            <span style={styles.rangeValue}>
              {selectedRangeLabel}
            </span>
          </div>
        )}
        {weeklyTrendDaily.length === 0
          ? <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>No data</div>
          : <svg ref={weeklyCostSvgRef} style={{ width: '100%', display: 'block' }} />
        }
      </div>

      {/* Chart + breakdown row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '0.75rem', alignItems: 'start' }}>
        {/* Line chart */}
        <div ref={linePanelRef} style={{ ...styles.panel, minWidth: 0 }}>
          <div style={styles.panelLabel}>Daily Token Usage · {selectedRangeLabel}</div>
          {weeklyTrendDaily.length === 0
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
        <div style={{ ...styles.panel, minWidth: 0, overflowX: 'auto' }}>
          <div style={styles.panelLabel}>Provider / Model · {selectedRangeLabel}</div>
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
                        <td style={{ ...styles.td, minWidth: '170px', maxWidth: '240px', whiteSpace: 'normal', wordBreak: 'break-word', opacity: 0.7 }}>{model}</td>
                        <td style={{ ...styles.td, textAlign: 'right' as const }}>{stats.calls.toLocaleString()}</td>
                        <td style={{ ...styles.td, textAlign: 'right' as const, color: '#61F6EA', fontWeight: 600 }}>{formatTokens(stats.totalTokens)}</td>
                        <td style={{ ...styles.td, textAlign: 'right' as const, color: '#FFD700', fontWeight: 600 }}>{formatCost(stats.totalCost)}</td>
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
