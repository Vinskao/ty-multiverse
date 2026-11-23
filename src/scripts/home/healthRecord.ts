import { formatNumber } from '../format/numbers';
import { hasPalaisCheckerRole } from '../navigation/menu';

type Lang = 'zh' | 'en';
type Week = { start: string; km: number };
export type HealthSummary = {
  running: { runs: number; totalKm: number; peakDay: { day: string; km: number } | null;
    fastest: { day: string; km: number; secondsPerKm: number } | null;
    thisWeekKm: number; peakWeek: Week | null; weeks: Week[]; lastRun: string | null };
};
/** Other activities and metrics: owner and Palais Checkers only. */
export type HealthOverview = {
  activities: { activity: string; sessions: number; km: number; hours: number }[];
  metrics: { metric: string; unit: string; last_day: string; latest: number | null; peak: number | null; peak_day: string; average30: number | null }[];
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
    { label: t('本週累積', 'This week'), value: km(r.thisWeekKm), note: t('週一起算', 'From Monday') },
    { label: t('單週最高', 'Best week'), value: r.peakWeek ? km(r.peakWeek.km) : '—', note: r.peakWeek ? t(`${r.peakWeek.start} 當週`, `Week of ${r.peakWeek.start}`) : '' },
    { label: t('總里程', 'Total distance'), value: km(r.totalKm), note: t(`${formatNumber(r.runs, 'count')} 次`, `${formatNumber(r.runs, 'count')} runs`) },
  ];
}

const readable = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

export function overviewTiles({ activities, metrics }: HealthOverview, lang: Lang): Tile[] {
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  return [
    ...activities.filter(a => a.activity !== 'Running').map(a => ({ label: readable(a.activity),
      value: a.km > 0 ? km(a.km) : `${formatNumber(a.hours, 'decimal')} h`,
      note: t(`${formatNumber(a.sessions, 'count')} 次，共 ${formatNumber(a.hours, 'decimal')} 小時`, `${formatNumber(a.sessions, 'count')} sessions, ${formatNumber(a.hours, 'decimal')} hours`) })),
    ...metrics.map(m => {
      const kind = COUNTS.has(m.metric) ? 'count' : 'decimal';
      const unit = !m.unit || m.unit === 'count' ? '' : ` ${m.unit}`;
      const show = (value: number | null) => (value === null ? '—' : formatNumber(value, kind) + unit);
      return { label: METRICS[m.metric]?.[lang === 'zh' ? 0 : 1] ?? readable(m.metric), value: show(m.latest),
        note: t(`${day(m.last_day)}；近 30 天平均 ${show(m.average30)}；最高 ${show(m.peak)}（${day(m.peak_day)}）`,
          `${day(m.last_day)}; 30-day average ${show(m.average30)}; peak ${show(m.peak)} (${day(m.peak_day)})`) };
    }),
  ];
}

/** Only decides whether to ask; the backend makes the real decision. */
export function mayReadOverview(token: string | null): boolean {
  if (hasPalaisCheckerRole(token)) return true;
  try {
    const claims = JSON.parse(atob((token ?? '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return [claims.realm_access, ...Object.values(claims.resource_access ?? {})].some((access: any) => access?.roles?.includes('manage-users'));
  } catch {
    return false;
  }
}

type Deps = { fetch: typeof fetch; lang: () => Lang; onLang: (callback: () => void) => void; token: () => string | null };
const appLang = () => (window as any).AppLang;
const defaults: Deps = {
  fetch: (...args) => fetch(...args),
  lang: () => (appLang()?.get() === 'zh' ? 'zh' : 'en'),
  onLang: callback => { appLang()?.onChange(callback); },
  token: () => { try { return localStorage.getItem('token'); } catch { return null; } },
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
  let overview: HealthOverview | undefined;
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
    const text = (w: Week) => t(`${w.start} 當週：跑步 ${km(w.km)}`, `Week of ${w.start}: ran ${km(w.km)}`);
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
    box.append(element('figcaption', '', t(`近 12 週跑量（公里，最高 ${km(max)}）`, `Running distance, last 12 weeks (km, top of scale ${km(max)})`)), bars, readout);
    return box;
  };
  const render = () => {
    if (state === 'loading') status.textContent = deps.lang() === 'zh' ? '載入中…' : 'Loading…';
    if (!data) return;
    const lang = deps.lang();
    const run = runningTiles(data, lang);
    body.replaceChildren(...(run.length ? [tiles(run), chart(data.running.weeks, lang)] : []),
      ...(overview ? [element('h4', 'health-private', lang === 'zh' ? '其他健康資料（僅 Palais 權限可見）' : 'Other health data (Palais access only)'), tiles(overviewTiles(overview, lang))] : []));
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
      const token = deps.token();
      if (mayReadOverview(token)) {
        // A refusal or failure here must not hide the public part.
        const extra = await deps.fetch(`${base}/health-data/overview`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
          cache: 'no-store', signal: AbortSignal.timeout(20000) }).catch(() => undefined);
        overview = extra?.ok ? (await extra.json()).data as HealthOverview : undefined;
      }
      state = 'done';
      section.hidden = !data.running.runs && !overview;
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
