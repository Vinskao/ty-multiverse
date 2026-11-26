import { formatNumber } from '../format/numbers';

type Lang = 'zh' | 'en';
type Week = { start: string; km: number };
export type HealthSummary = {
  running: { runs: number; totalKm: number; peakDay: { day: string; km: number } | null;
    fastest: { day: string; km: number; secondsPerKm: number } | null;
    thisWeekKm: number; peakWeek: Week | null; weeks: Week[]; lastRun: string | null };
  other?: HealthOther;
};
/** Other activities and the daily activity totals; public together with the running statistics. */
export type HealthOther = {
  activities: { activity: string; sessions: number; km: number; hours: number }[];
  metrics: { metric: string; unit: string; last_day: string; latest: number | null; peak: number | null; peak_day: string; average30: number | null }[];
  series: { metric: string; day: string; value: number }[];
};
export type Tile = { label: string; value: string; note: string };

const METRICS: Record<string, [string, string]> = {
  StepCount: ['步數', 'Steps'], DistanceWalkingRunning: ['步行＋跑步距離', 'Walking + running distance'],
  DistanceCycling: ['單車距離', 'Cycling distance'], FlightsClimbed: ['爬樓層數', 'Flights climbed'],
  AppleExerciseTime: ['運動時間', 'Exercise time'], ActiveEnergyBurned: ['活動熱量', 'Active energy'],
};
const COUNTS = new Set(['StepCount', 'FlightsClimbed', 'AppleExerciseTime', 'ActiveEnergyBurned']);

export function formatPace(secondsPerKm: number): string {
  const total = Math.round(secondsPerKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} /km`;
}

const km = (value: number) => `${formatNumber(value, 'decimal')} km`;
const day = (value: string | null) => String(value ?? '').slice(0, 10);

export function runningTiles({ running: r }: HealthSummary, lang: Lang): Tile[] {
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  if (!r.runs) return [];
  return [
    { label: t('單日跑量高峰', 'Longest day'), value: r.peakDay ? km(r.peakDay.km) : '—', note: day(r.peakDay?.day ?? null) },
    { label: t('最快均速（3 公里以上）', 'Fastest average pace (3 km+)'), value: r.fastest ? formatPace(r.fastest.secondsPerKm) : '—',
      note: r.fastest ? `${km(r.fastest.km)} · ${day(r.fastest.day)}` : '' },
    { label: t('本週累積（跑步＋健行）', 'This week (running + hiking)'), value: km(r.thisWeekKm), note: t('週一起算', 'From Monday') },
    { label: t('單週最高（跑步＋健行）', 'Best week (running + hiking)'), value: r.peakWeek ? km(r.peakWeek.km) : '—', note: r.peakWeek ? t(`${r.peakWeek.start} 當週`, `Week of ${r.peakWeek.start}`) : '' },
    { label: t('總里程', 'Total distance'), value: km(r.totalKm), note: t(`${formatNumber(r.runs, 'count')} 次`, `${formatNumber(r.runs, 'count')} runs`) },
  ];
}

const readable = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

export type MetricChart = { label: string; value: string; note: string; days: { day: string; value: number; text: string; h: number }[] };
export type ActivityBar = { label: string; text: string; h: number };

/** One chart per daily metric (the last 30 days) with its latest value, average and peak. */
export function metricCharts({ metrics, series }: HealthOther, lang: Lang): MetricChart[] {
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  return metrics.map(m => {
    const kind = COUNTS.has(m.metric) ? 'count' : 'decimal';
    const unit = !m.unit || m.unit === 'count' ? '' : ` ${m.unit}`;
    const show = (value: number | null) => (value === null ? '—' : formatNumber(value, kind) + unit);
    const label = METRICS[m.metric]?.[lang === 'zh' ? 0 : 1] ?? readable(m.metric);
    const rows = series.filter(r => r.metric === m.metric);
    const max = Math.max(...rows.map(r => r.value), 1);
    return { label, value: show(m.latest),
      note: t(`${day(m.last_day)}；近 30 天平均 ${show(m.average30)}；最高 ${show(m.peak)}（${day(m.peak_day)}）`,
        `${day(m.last_day)}; 30-day average ${show(m.average30)}; peak ${show(m.peak)} (${day(m.peak_day)})`),
      days: rows.map(r => ({ day: r.day, value: r.value, text: `${day(r.day)}：${label} ${show(r.value)}`, h: (r.value / max) * 100 })) };
  });
}

/** Other sports as horizontal bars sized by time spent. */
export function activityBars({ activities }: HealthOther, lang: Lang): ActivityBar[] {
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  const rows = activities.filter(a => a.activity !== 'Running');
  const max = Math.max(...rows.map(a => a.hours), 0.01);
  return rows.map(a => ({ label: readable(a.activity),
    text: [t(`${formatNumber(a.sessions, 'count')} 次`, `${formatNumber(a.sessions, 'count')} sessions`), a.km > 0 ? km(a.km) : '',
      `${formatNumber(a.hours, 'decimal')} h`].filter(Boolean).join(' · '),
    h: (a.hours / max) * 100 }));
}

type Deps = { fetch: typeof fetch; lang: () => Lang; onLang: (callback: () => void) => void };
const appLang = () => (window as any).AppLang;
const defaults: Deps = {
  fetch: (...args) => fetch(...args),
  lang: () => (appLang()?.get() === 'zh' ? 'zh' : 'en'),
  onLang: callback => { appLang()?.onChange(callback); },
};

function element(tag: string, className: string, text = ''): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

/** Loads the public health summary the first time the surrounding <details> opens; stays hidden when there is no data. */
export function initHealthRecord(root: ParentNode = document, deps: Deps = defaults, base: string = import.meta.env.PUBLIC_TYMB_URL): void {
  const section = root.querySelector<HTMLElement>('[data-health-record]');
  const details = section?.closest('details');
  const status = section?.querySelector<HTMLElement>('[data-health-status]');
  const body = section?.querySelector<HTMLElement>('[data-health-body]');
  if (!section || !details || !status || !body || !base || section.dataset.bound) return;
  section.dataset.bound = 'true';
  let data: HealthSummary | undefined;
  let state: 'idle' | 'loading' | 'done' = 'idle';

  const tiles = (rows: Tile[]) => {
    const list = element('dl', 'health-tiles');
    for (const row of rows) {
      const item = element('div', 'health-tile');
      item.append(element('dt', '', row.label), element('dd', 'health-value', row.value), element('dd', 'health-note', row.note));
      list.append(item);
    }
    return list;
  };
  const chart = (weeks: Week[], lang: Lang) => {
    const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
    const box = element('figure', 'health-chart');
    const bars = element('div', 'health-bars');
    const readout = element('p', 'health-readout');
    const max = Math.max(...weeks.map(w => w.km), 1);
    const text = (w: Week) => t(`${w.start} 當週：跑步＋健行 ${km(w.km)}`, `Week of ${w.start}: running + hiking ${km(w.km)}`);
    for (const week of weeks) {
      const bar = element('button', 'health-bar') as HTMLButtonElement;
      bar.type = 'button';
      bar.setAttribute('aria-label', text(week));
      bar.style.setProperty('--h', `${(week.km / max) * 100}%`);
      bar.append(element('span', 'health-fill'), element('small', '', week.start.slice(5).replace('-', '/')));
      for (const event of ['mouseenter', 'focus', 'click']) bar.addEventListener(event, () => { readout.textContent = text(week); });
      bars.append(bar);
    }
    readout.textContent = weeks.length ? text(weeks[weeks.length - 1]) : '';
    readout.setAttribute('aria-live', 'polite');
    box.append(element('figcaption', '', t(`近 12 週跑步＋健行距離（公里，最高 ${km(max)}）`, `Running + hiking distance, last 12 weeks (km, top of scale ${km(max)})`)), bars, readout);
    return box;
  };
  const activities = (other: HealthOther, lang: Lang) => {
    const list = element('div', 'health-activities');
    for (const row of activityBars(other, lang)) {
      const item = element('div', 'health-activity');
      const track = element('span', 'health-activity-track');
      const fill = element('span', 'health-activity-fill');
      fill.style.setProperty('--w', `${Math.max(row.h, 2)}%`);
      track.append(fill);
      item.append(element('span', 'health-activity-name', row.label), track, element('small', 'health-note', row.text));
      list.append(item);
    }
    return list;
  };
  const sparks = (other: HealthOther, lang: Lang) => {
    const grid = element('div', 'health-sparks');
    for (const m of metricCharts(other, lang)) {
      const card = element('figure', 'health-spark-card');
      const bars = element('div', 'health-spark');
      const readout = element('p', 'health-readout', m.value);
      for (const d of m.days) {
        const bar = element('button', 'health-spark-bar') as HTMLButtonElement;
        bar.type = 'button';
        bar.setAttribute('aria-label', d.text);
        bar.title = d.text;
        bar.style.setProperty('--h', `${Math.max(d.h, 3)}%`);
        for (const event of ['mouseenter', 'focus', 'click']) bar.addEventListener(event, () => { readout.textContent = d.text; });
        bars.append(bar);
      }
      readout.setAttribute('aria-live', 'polite');
      card.append(element('figcaption', 'health-spark-title', m.label), element('p', 'health-value', m.value), bars, readout, element('small', 'health-note', m.note));
      grid.append(card);
    }
    return grid;
  };
  const render = () => {
    if (state === 'loading') status.textContent = deps.lang() === 'zh' ? '載入中…' : 'Loading…';
    if (!data) return;
    const lang = deps.lang();
    const run = runningTiles(data, lang);
    body.replaceChildren(...(run.length ? [tiles(run), chart(data.running.weeks, lang)] : []),
      ...(data.other ? [element('h4', 'health-other', lang === 'zh' ? '其他健康資料' : 'Other health data'), activities(data.other, lang), sparks(data.other, lang)] : []));
  };
  const load = async () => {
    if (!details.open || state !== 'idle') return;
    state = 'loading';
    section.hidden = false;
    status.hidden = false;
    status.setAttribute('aria-busy', 'true');
    render();
    try {
      const response = await deps.fetch(`${base}/health-data/summary`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = (await response.json()).data as HealthSummary;
      state = 'done';
      section.hidden = !data.running.runs && !data.other?.metrics.length;
      render();
    } catch {
      // Closing and reopening the block tries again.
      data = undefined;
      state = 'idle';
      section.hidden = true;
    } finally {
      status.hidden = true;
      status.removeAttribute('aria-busy');
    }
  };
  details.addEventListener('toggle', event => { if (event.target === details) void load(); });
  deps.onLang(render);
  void load();
}
