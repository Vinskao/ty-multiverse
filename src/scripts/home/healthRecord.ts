import { formatNumber } from '../format/numbers';
import { formatDuration, progress, sportsIn, SPORT_LABELS, type Sport, type Workout } from './healthProgress';

type Lang = 'zh' | 'en';
type Week = { start: string; km: number };
export type HealthSummary = {
  running: { runs: number; totalKm: number; peakDay: { day: string; km: number } | null;
    fastest: { day: string; km: number; secondsPerKm: number } | null;
    thisWeekKm: number; peakWeek: Week | null; weeks: Week[]; lastRun: string | null };
  records?: HealthRecords;
  other?: HealthOther;
  workouts?: Workout[];
};
type Effort = { value: number; day: string };
export type HealthRecords = {
  prs: (Effort & { key: string; longest?: Effort; fastest?: Effort | null })[];
  weekStreaks: { km: number; current: number; best: number }[];
  dayStreak: number; bestDayStreak: number;
  months: { month: string; runKm: number; hikeKm: number }[];
};
/** Other activities and the daily activity totals; public together with the running statistics. */
export type HealthOther = {
  activities: { activity: string; sessions: number; km: number; hours: number }[];
  metrics: { metric: string; unit: string; last_day: string; latest: number | null; peak: number | null; peak_day: string; average30: number | null }[];
  series: { metric: string; day: string; value: number }[];
};
export type Tile = { label: string; value: string; note: string; detail?: string; status?: string };

function monthlyDistanceTicks(peakKm: number): number[] {
  const target = Math.max(peakKm / 6, 1);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const step = [1, 2, 5, 10].map(n => n * magnitude).find(n => n >= target)!;
  return Array.from({ length: Math.ceil(peakKm / step) + 1 }, (_, i) => i * step);
}

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

export type Hero = { label: string; value: string; note: string; trend: 'up' | 'down' | 'flat' | 'none' };

/** This week's running + hiking distance against last week, the first thing a visitor wants to know. */
export function thisWeek({ running: r }: HealthSummary, lang: Lang): Hero {
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  const last = r.weeks.length >= 2 ? r.weeks[r.weeks.length - 2].km : null;
  const label = t('本週（跑步＋健行）', 'This week (running + hiking)');
  if (last === null) return { label, value: km(r.thisWeekKm), note: t('週一起算', 'Counted from Monday'), trend: 'none' };
  const diff = r.thisWeekKm - last;
  const trend = Math.abs(diff) < 0.05 ? 'flat' : diff > 0 ? 'up' : 'down';
  const compare = trend === 'flat' ? t('與上週相同', 'Same as last week')
    : t(`比上週${diff > 0 ? '多' : '少'} ${km(Math.abs(diff))}`, `${km(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than last week`);
  return { label, value: km(r.thisWeekKm), note: `${t(`上週 ${km(last)}`, `Last week ${km(last)}`)} · ${compare}`, trend };
}

const readable = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

const clock = (seconds: number) => {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

const PR_LABELS: Record<string, [string, string]> = {
  fastest1kS: ['最快 1 公里', 'Fastest 1 km'], fastest5kS: ['最快 5 公里', 'Fastest 5 km'],
  fastest10kPace: ['10 公里以上最快均速', 'Fastest pace, 10 km+'], fastestHalfPace: ['半馬以上最快均速', 'Fastest pace, half marathon+'],
  longestRunKm: ['最長跑步', 'Longest run'], longestHikeKm: ['最長健行', 'Longest hike'],
  lowestAvgHr: ['最低平均心率（跑步）', 'Lowest average heart rate (running)'],
  fewestBeatsPerKm: ['最省心跳（每公里）', 'Most efficient (beats per km)'],
  mostAscentM: ['單次最大爬升', 'Biggest single climb'], bestWeekKm: ['單週最多（跑步＋健行）', 'Best week (running + hiking)'],
  bestMonthKm: ['單月最多（跑步＋健行）', 'Best month (running + hiking)'],
};
const PR_ORDER = ['fastest1kS', 'fastest5kS', 'fastest10kPace', 'fastestHalfPace', 'longestRunKm', 'longestHikeKm', 'lowestAvgHr', 'fewestBeatsPerKm', 'mostAscentM', 'bestWeekKm', 'bestMonthKm'];

function prValue(key: string, value: number): string {
  if (key === 'fastest1kS' || key === 'fastest5kS') return clock(value);
  if (key.endsWith('Pace')) return formatPace(value);
  if (key === 'fewestBeatsPerKm') return `${formatNumber(value, 'count')} ${'beats/km'}`;
  if (key === 'lowestAvgHr') return `${formatNumber(value, 'decimal')} bpm`;
  if (key === 'mostAscentM') return `${formatNumber(value, 'count')} m`;
  return km(value);
}

const PR_GROUPS: { title: [string, string]; keys: string[] }[] = [
  { title: ['速度與心率', 'Speed and heart rate'], keys: ['fastest1kS', 'fastest5kS', 'fastest10kPace', 'fastestHalfPace', 'lowestAvgHr', 'fewestBeatsPerKm'] },
  { title: ['單次距離與爬升', 'Single outings'], keys: ['longestRunKm', 'longestHikeKm', 'mostAscentM'] },
  { title: ['累積', 'Volume'], keys: ['bestWeekKm', 'bestMonthKm'] },
];

/** Records under three headings (speed, single outings, volume), each in a fixed order so the page does not jump around. */
export function recordGroups(records: HealthRecords, lang: Lang): { title: string; tiles: Tile[] }[] {
  return PR_GROUPS.map(g => ({ title: g.title[lang === 'zh' ? 0 : 1], tiles: recordTiles(records, lang, g.keys) })).filter(g => g.tiles.length);
}

/** Best single efforts, in a fixed order so the page does not jump around as records appear. */
export function recordTiles({ prs }: HealthRecords, lang: Lang, order: string[] = PR_ORDER): Tile[] {
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  return order.flatMap(key => {
    const pr = prs.find(p => p.key === key && p.value > 0);
    if (!pr) return [];

    const label = '🏆 ' + PR_LABELS[key][lang === 'zh' ? 0 : 1];
    const tile: Tile = { label, value: prValue(key, pr.value), note: day(pr.day) };
    if (pr.longest) {
      const eff = key === 'fewestBeatsPerKm';
      const hr = eff && pr.fastest ? Math.round(pr.value / (pr.fastest.value / 60)) : null;
      tile.note = (hr ? `${hr} bpm · ` : '') + t(eff ? '距離' : '最長距離', eff ? 'Distance' : 'Longest distance') + ' ' + km(pr.longest.value) + ' · ' + day(pr.longest.day);
      tile.detail = t(eff ? '配速' : '最快配速', eff ? 'Pace' : 'Fastest pace') + ' ' + (pr.fastest ? formatPace(pr.fastest.value) + (eff ? '' : ' · ' + day(pr.fastest.day)) : '—');
    }
    return [tile];
  });
}

/** Consecutive weeks above a distance (current and best) and consecutive active days. */
export function streakTiles({ weekStreaks, dayStreak, bestDayStreak }: HealthRecords, lang: Lang): Tile[] {
  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
  const weeks = (n: number) => t(`${formatNumber(n, 'count')} 週`, `${formatNumber(n, 'count')} wk`);
  const days = (n: number) => t(`${formatNumber(n, 'count')} 天`, `${formatNumber(n, 'count')} d`);
  const status = t('連續中', 'On streak');
  return [
    ...weekStreaks.filter(s => s.current > 0).map(s => ({ label: t(`🔥 連續每週 ${s.km} km 以上`, `🔥 Weeks in a row of ${s.km} km+`),
      value: weeks(s.current), status, note: t(`歷史最佳 ${weeks(s.best)}`, `Best ${weeks(s.best)}`) })),
    ...(dayStreak > 0 ? [{ label: t('🔥 連續運動天數', '🔥 Active days in a row'), value: days(dayStreak), status, note: t(`歷史最佳 ${days(bestDayStreak)}`, `Best ${days(bestDayStreak)}`) }] : []),
  ];
}

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
  let sport: Sport = 'all';

  const tiles = (rows: Tile[]) => {
    const list = element('dl', 'health-tiles');
    for (const row of rows) {
      const item = element('div', 'health-tile');
      item.append(element('dt', '', row.label), element('dd', 'health-value', row.value), element('dd', 'health-note', row.note));
      if (row.detail) item.append(element('dd', 'health-note', row.detail));
      if (row.status) item.append(element('dd', 'health-streak-status', row.status));
      list.append(item);
    }
    return list;
  };
  const axisFor = (peak: number) => {
    const axis = element('div', 'health-month-axis');
    axis.append(element('span', 'health-axis-unit', 'km'));
    const ticks = monthlyDistanceTicks(peak);
    const max = ticks[ticks.length - 1];
    for (const value of ticks) {
      const tick = element('span', 'health-axis-tick', formatNumber(value, 'count'));
      tick.style.bottom = String((value / max) * 100) + '%';
      axis.append(tick);
    }
    return { axis, max };
  };
  const chart = (weeks: Week[], lang: Lang) => {
    const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
    const box = element('figure', 'health-chart');
    const plot = element('div', 'health-month-plot');
    const bars = element('div', 'health-bars health-month-bars');
    const readout = element('p', 'health-readout');
    const peak = Math.max(...weeks.map(w => w.km), 0);
    const { axis, max } = axisFor(peak);
    const text = (w: Week) => t(`${w.start} 當週：跑步＋健行 ${km(w.km)}`, `Week of ${w.start}: running + hiking ${km(w.km)}`);
    for (const week of weeks) {
      const bar = element('button', week === weeks[weeks.length - 1] ? 'health-bar is-current' : 'health-bar') as HTMLButtonElement;
      bar.type = 'button';
      bar.setAttribute('aria-label', text(week));
      bar.style.setProperty('--h', `${(week.km / max) * 100}%`);
      bar.append(element('span', 'health-fill'), element('small', '', week.start.slice(5).replace('-', '/')));
      for (const event of ['mouseenter', 'focus', 'click']) bar.addEventListener(event, () => { readout.textContent = text(week); });
      bars.append(bar);
    }
    readout.textContent = weeks.length ? text(weeks[weeks.length - 1]) : '';
    readout.setAttribute('aria-live', 'polite');
    plot.append(axis, bars);
    box.append(element('figcaption', '', t(`近 12 週，最右邊亮色是本週`, `Last 12 weeks; the bright bar on the right is this week`)), plot, readout);
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
  const monthChart = (months: HealthRecords['months'], lang: Lang) => {
    const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
    const box = element('figure', 'health-chart');
    const plot = element('div', 'health-month-plot');
    const bars = element('div', 'health-bars health-month-bars');
    const axis = element('div', 'health-month-axis');
    axis.append(element('span', 'health-axis-unit', 'km'));
    const readout = element('p', 'health-readout');
    const peak = Math.max(...months.map(m => m.runKm + m.hikeKm));
    const ticks = monthlyDistanceTicks(peak);
    const max = ticks[ticks.length - 1];
    for (const value of ticks) {
      const tick = element('span', 'health-axis-tick', formatNumber(value, 'count'));
      tick.style.bottom = String((value / max) * 100) + '%';
      axis.append(tick);
    }
    const text = (m: HealthRecords['months'][number]) => t(`${m.month}：跑步 ${km(m.runKm)}，健行 ${km(m.hikeKm)}`, `${m.month}: running ${km(m.runKm)}, hiking ${km(m.hikeKm)}`);
    for (const m of months) {
      const bar = element('button', 'health-bar health-month') as HTMLButtonElement;
      bar.type = 'button';
      bar.setAttribute('aria-label', text(m));
      bar.style.setProperty('--h', `${((m.runKm + m.hikeKm) / max) * 100}%`);
      bar.style.setProperty('--run', `${(m.runKm / Math.max(m.runKm + m.hikeKm, 0.01)) * 100}%`);
      const stack = element('span', 'health-fill health-stack');
      stack.append(element('span', 'health-stack-hike'), element('span', 'health-stack-run'));
      bar.append(stack, element('small', '', m.month.slice(5)));
      for (const event of ['mouseenter', 'focus', 'click']) bar.addEventListener(event, () => { readout.textContent = text(m); });
      bars.append(bar);
    }
    readout.textContent = months.length ? text(months[months.length - 1]) : '';
    readout.setAttribute('aria-live', 'polite');
    plot.append(axis, bars);
    box.append(element('figcaption', '', t(`公里，最高 ${km(peak)}`, `km, peak ${km(peak)}`)), plot, readout);
    return box;
  };
  const block = (title: string, caption: string, ...content: HTMLElement[]) => {
    const wrap = element('section', 'health-block');
    wrap.append(element('h4', 'health-block-title', title), element('p', 'health-caption', caption), ...content);
    return wrap;
  };
  const hero = (summary: HealthSummary, lang: Lang) => {
    const h = thisWeek(summary, lang);
    const card = element('div', `health-hero health-hero-${h.trend}`);
    const arrow = h.trend === 'up' ? '▲ ' : h.trend === 'down' ? '▼ ' : '';
    card.append(element('p', 'health-hero-label', h.label), element('p', 'health-hero-value', h.value), element('p', 'health-hero-note', arrow + h.note));
    return card;
  };
  const legend = (items: [string, string][]) => {
    const list = element('p', 'health-legend');
    for (const [cls, text] of items) {
      const item = element('span', 'health-legend-item');
      item.append(element('span', `health-swatch ${cls}`), text);
      list.append(item);
    }
    return list;
  };
  const progressPanel = (workouts: Workout[], lang: Lang) => {
    const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
    const sports = sportsIn(workouts);
    if (!sports.includes(sport)) sport = 'all';
    const p = progress(workouts, sport, today);
    const card = element('section', 'hp-card');
    const chips = element('div', 'hp-chips');
    chips.setAttribute('role', 'tablist');
    for (const s of sports) {
      const [zh, en, icon] = SPORT_LABELS[s];
      const chip = element('button', s === sport ? 'hp-chip is-active' : 'hp-chip', `${icon} ${t(zh, en)}`) as HTMLButtonElement;
      chip.type = 'button';
      chip.setAttribute('role', 'tab');
      chip.setAttribute('aria-selected', String(s === sport));
      chip.addEventListener('click', () => { sport = s; render(); });
      chips.append(chip);
    }
    const stats = element('dl', 'hp-stats');
    const heading = element('h4', 'hp-title');
    const show = (index: number) => {
      const w = p.weeks[index];
      const end = new Date(Date.parse(w.start + 'T00:00:00Z') + 6 * 86400000).toISOString().slice(5, 10).replace('-', '/');
      heading.textContent = index === 11 ? t('本週', 'This week') : `${w.start.slice(5).replace('-', '/')}–${end}`;
      stats.replaceChildren();
      for (const [label, value] of [[t('距離', 'Distance'), t(`${formatNumber(w.km, 'decimal')} 公里`, `${formatNumber(w.km, 'decimal')} km`)],
        [t('時間', 'Time'), formatDuration(w.seconds, lang)], [t('爬升海拔', 'Elevation'), t(`${formatNumber(w.ascentM, 'count')} 公尺`, `${formatNumber(w.ascentM, 'count')} m`)]]) {
        const item = element('div', 'hp-stat');
        item.append(element('dt', '', label), element('dd', '', value));
        stats.append(item);
      }
      nowLine?.setAttribute('x1', String(x(index)));
      nowLine?.setAttribute('x2', String(x(index)));
      dots.forEach((d, i) => d.classList.toggle('is-selected', i === index));
    };
    const dots: SVGElement[] = [];
    let nowLine: SVGElement | undefined;
    // 12-week line: plot area 0..300 x 0..100, axis labels on the right.
    const peak = Math.max(...p.weeks.map(w => w.km), 0);
    const step = peak <= 10 ? 5 : peak <= 20 ? 10 : peak <= 60 ? 20 : 50;
    const top = Math.max(step * 2, Math.ceil(peak / step) * step);
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 340 130');
    svg.setAttribute('class', 'hp-chart');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', t('過去 12 週距離', 'Distance over the last 12 weeks'));
    const x = (i: number) => 8 + (i * 272) / 11;
    const y = (km: number) => 105 - (km / top) * 95;
    const add = (tag: string, attrs: Record<string, string | number>, text?: string) => {
      const el = document.createElementNS(ns, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
      if (text) el.textContent = text;
      svg.append(el);
      return el;
    };
    for (const v of [0, top / 2, top]) {
      add('line', { x1: 0, x2: 284, y1: y(v), y2: y(v), class: 'hp-grid' });
      add('text', { x: 292, y: y(v) + 4, class: 'hp-axis' }, t(`${formatNumber(v, 'count')} 公里`, `${formatNumber(v, 'count')} km`));
    }
    const pts = p.weeks.map((w, i) => `${x(i)},${y(w.km)}`).join(' ');
    add('polygon', { points: `${x(0)},${y(0)} ${pts} ${x(11)},${y(0)}`, class: 'hp-area' });
    add('polyline', { points: pts, class: 'hp-line' });
    nowLine = add('line', { x1: x(11), x2: x(11), y1: 8, y2: y(0), class: 'hp-now' });
    let lastMonth = '';
    p.weeks.forEach((w, i) => {
      const month = w.start.slice(5, 7);
      if (month !== lastMonth && i > 0 && i < 11) add('text', { x: x(i), y: 124, class: 'hp-axis hp-month', 'text-anchor': 'middle' }, t(`${Number(month)} 月`, new Date(w.start).toLocaleString('en', { month: 'short', timeZone: 'UTC' })));
      lastMonth = month;
      dots.push(add('circle', { cx: x(i), cy: y(w.km), r: 4, class: 'hp-dot' }));
    });
    // A full-height invisible column per week, so a point is easy to hit with a finger, a mouse or the keyboard.
    p.weeks.forEach((w, i) => {
      const hit = add('rect', { x: x(i) - 12, y: 0, width: 24, height: 130, class: 'hp-hit', tabindex: 0, role: 'button',
        'aria-label': t(`${w.start} 當週 ${formatNumber(w.km, 'decimal')} 公里`, `Week of ${w.start}: ${formatNumber(w.km, 'decimal')} km`) });
      for (const type of ['mouseenter', 'focus', 'click']) hit.addEventListener(type, () => show(i));
    });
    show(11);
    card.append(chips, heading, stats, element('p', 'hp-sub', t('過去 12 週', 'Past 12 weeks')), svg);

    const streak = element('section', 'hp-card hp-streak');
    const flame = element('div', 'hp-flame');
    flame.append(element('span', 'hp-flame-num', String(p.streakWeeks)), element('span', 'hp-flame-unit', t('週', p.streakWeeks === 1 ? 'week' : 'weeks')));
    const grid = element('div', 'hp-dots');
    grid.setAttribute('aria-label', t('本月有運動的日子', 'Active days this month'));
    for (const cell of p.month.flat()) {
      const dot = element('span', cell ? `hp-day${cell.active ? ' is-active' : ''}${cell.today ? ' is-today' : ''}${cell.future ? ' is-future' : ''}` : 'hp-day is-blank');
      if (cell) dot.title = cell.day;
      grid.append(dot);
    }
    const head = element('div', 'hp-streak-head');
    head.append(element('h4', 'hp-title', t('連續紀錄', 'Streak')), element('span', 'hp-sub', t('本月', 'This month')));
    const bodyRow = element('div', 'hp-streak-body');
    bodyRow.append(flame, grid);
    streak.append(head, bodyRow);
    const wrap = element('div', 'hp-progress');
    wrap.append(card, streak);
    return wrap;
  };
  const render = () => {
    if (state === 'loading') status.textContent = deps.lang() === 'zh' ? '載入中…' : 'Loading…';
    if (!data) return;
    const lang = deps.lang();
    const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);
    const records = data.records;
    const groups = records ? recordGroups(records, lang) : [];
    const streaks = records ? streakTiles(records, lang) : [];
    const hasMonths = !!records && records.months.some(m => m.runKm + m.hikeKm > 0);
    const blocks: HTMLElement[] = [];
    const pair: HTMLElement[] = []; // the weekly and monthly charts sit side by side
    if (data.workouts?.length) {
      blocks.push(progressPanel(data.workouts, lang));
    } else if (data.running.runs || data.running.weeks.some(w => w.km > 0)) {
      pair.push(block(t('本週', 'This week'), t('跑步加健行，週一起算，和上週比較', 'Running plus hiking from Monday, compared with last week'),
        hero(data, lang), chart(data.running.weeks, lang)));
    }
    if (hasMonths) {
      pair.push(block(t('每月距離', 'Distance by month'), t('近 12 個月，跑步與健行分開看', 'The last 12 months, running and hiking apart'),
        legend([['health-swatch-run', t('跑步', 'Running')], ['health-swatch-hike', t('健行', 'Hiking')]]), monthChart(records!.months, lang)));
    }
    if (groups.length) {
      blocks.push(block(t('個人紀錄', 'Personal records'), t('歷史最佳的單次表現，日期是創下紀錄的那天', 'Best single performances; the date is the day it was set'),
        ...groups.flatMap(g => [element('h5', 'health-group-title', g.title), tiles(g.tiles)])));
    }
    if (streaks.length) {
      blocks.push(block(t('連續紀錄', 'Streaks'), t('目前正在持續中的紀錄，附歷史最佳', 'Streaks still going, with the best ever'), tiles(streaks)));
    }
    if (data.other) {
      blocks.push(block(t('日常活動', 'Daily activity'), t('其他運動的時間，以及近 30 天每天的步數、距離、爬樓、運動時間與熱量', 'Time spent in other sports, and the last 30 days of steps, distance, flights, exercise and energy'),
        activities(data.other, lang), sparks(data.other, lang)));
    }
    if (pair.length) { const row = element('div', 'health-pair'); row.append(...pair); blocks.splice(data.workouts?.length ? 1 : 0, 0, row); }
    body.replaceChildren(...blocks);
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
      section.hidden = !data.running.runs && !data.records?.prs.length && !data.other?.metrics.length;
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
