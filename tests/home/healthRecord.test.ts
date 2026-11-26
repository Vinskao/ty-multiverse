import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { activityBars, formatPace, initHealthRecord, metricCharts, recordGroups, recordTiles, streakTiles, thisWeek, type HealthOther, type HealthRecords, type HealthSummary } from '../../src/scripts/home/healthRecord';

const weeks = Array.from({ length: 12 }, (_, i) => ({ start: `2026-09-${String(i + 1).padStart(2, '0')}`, km: i }));
const summary: HealthSummary = {
  running: { runs: 3, totalKm: 26.5, peakDay: { day: '2026-11-01', km: 11 }, fastest: { day: '2026-11-02', km: 5, secondsPerKm: 299.6 },
    thisWeekKm: 4, peakWeek: { start: '2026-10-26', km: 21 }, weeks, lastRun: '2026-11-02' },
};
const other: HealthOther = {
  activities: [{ activity: 'Running', sessions: 3, km: 26.5, hours: 3 }, { activity: 'CoreTraining', sessions: 2, km: 0, hours: 1.5 }],
  metrics: [{ metric: 'StepCount', unit: 'count', last_day: '2026-11-02', latest: 8000, peak: 30000, peak_day: '2026-11-01', average30: null }],
  series: [{ metric: 'StepCount', day: '2026-11-01', value: 30000 }, { metric: 'StepCount', day: '2026-11-02', value: 8000 }],
};
const setup = (fetcher: any) => {
  let lang: 'zh' | 'en' = 'zh';
  let changed = () => {};
  const root = document.createElement('div');
  root.innerHTML = '<details><section data-health-record hidden><p data-health-status hidden></p><div data-health-body></div></section></details>';
  initHealthRecord(root, { fetch: fetcher, lang: () => lang, onLang: callback => { changed = callback; } }, 'https://x/tymb');
  return { root, section: root.querySelector<HTMLElement>('section')!, details: root.querySelector('details')!,
    english: () => { lang = 'en'; changed(); } };
};

describe('health record', () => {
  it('rounds pace without producing 4:60', () => {
    expect(formatPace(299.6)).toBe('5:00 /km');
    expect(formatPace(305)).toBe('5:05 /km');
  });
  it('lists the running records and shows missing values as a dash', () => {
    const week = thisWeek(summary, 'zh');
    expect(week).toMatchObject({ value: '4.00 km', trend: 'down' });
    expect(week.note).toBe('上週 10.00 km · 比上週少 6.00 km');
    expect(thisWeek({ running: { ...summary.running, thisWeekKm: 12 } }, 'en').note).toBe('Last week 10.00 km · 2.00 km more than last week');
  });
  it('charts each daily metric over its days and bars the other sports by time', () => {
    const [steps] = metricCharts(other, 'en');
    expect(steps).toMatchObject({ label: 'Steps', value: '8,000', note: '2026-11-02; 30-day average —; peak 30,000 (2026-11-01)' });
    expect(steps.days.map(d => d.h)).toEqual([100, (8000 / 30000) * 100]);
    expect(steps.days[0].text).toBe('2026-11-01：Steps 30,000');
    expect(activityBars(other, 'zh')).toEqual([{ label: 'Core Training', text: '2 次 · 1.50 h', h: 100 }]);
  });
  it('shows the other health data to everyone, without any login', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ data: { ...summary, other } }) }));
    const page = setup(fetcher);
    page.details.open = true;
    await vi.waitFor(() => expect(page.root.querySelectorAll('.health-spark-bar')).toHaveLength(2));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(page.section.textContent).toContain('日常活動');
    expect(page.section.textContent).not.toContain('Palais');
    page.root.querySelectorAll<HTMLButtonElement>('.health-spark-bar')[0].click();
    expect(page.root.querySelector('.health-spark-card .health-readout')!.textContent).toContain('30,000');
    page.english();
    expect(page.section.textContent).toContain('Daily activity');
  });
  it('loads when opened, shows each week on focus and follows the language', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: summary }) });
    const page = setup(fetcher);
    expect(fetcher).not.toHaveBeenCalled();
    page.details.open = true;
    await vi.waitFor(() => expect(page.root.querySelectorAll('.health-bar')).toHaveLength(12));
    page.root.querySelectorAll<HTMLButtonElement>('.health-bar')[3].click();
    expect(page.root.querySelector('.health-readout')!.textContent).toContain('3.00 km');
    page.english();
    expect(page.section.textContent).toContain('This week (running + hiking)');
    expect(page.section.hidden).toBe(false);
  });
  it('hides itself when the backend fails', async () => {
    const page = setup(vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    page.details.open = true;
    await vi.waitFor(() => expect(page.root.querySelector('[aria-busy]')).toBeNull());
    await vi.waitFor(() => expect(page.section.hidden).toBe(true));
  });
  it('credits Apple Health and WorkOutDoors', () => {
    expect(readFileSync('src/components/HealthRecord.astro', 'utf8')).toContain('Powered by Apple Health and WorkOutDoors');
  });
  it('caps the chart size', () => {
    expect(readFileSync('src/components/HealthRecord.astro', 'utf8')).toMatch(/\.health-chart \{[^}]*max-width/);
  });
  const records: HealthRecords = {
    prs: [{ key: 'fastest5kS', value: 1500, day: '2026-10-01' }, { key: 'longestRunKm', value: 21.5, day: '2026-10-15' },
      { key: 'mostAscentM', value: 849, day: '2026-10-17' }, { key: 'fastest10kPace', value: 418.6, day: '2026-10-15' }],
    weekStreaks: [{ km: 10, current: 3, best: 5 }, { km: 40, current: 0, best: 0 }], dayStreak: 2, bestDayStreak: 4,
    months: [{ month: '2026-10', runKm: 40, hikeKm: 10 }, { month: '2026-11', runKm: 6.08, hikeKm: 16.55 }],
  };
  it('lists personal records in a fixed order with Strava-like values', () => {
    expect(recordTiles(records, 'en').map(t => [t.label, t.value, t.note])).toEqual([
      ['🏆 Fastest 5 km', '25:00', '2026-10-01'], ['🏆 Fastest pace, 10 km+', '6:59 /km', '2026-10-15'],
      ['🏆 Longest run', '21.50 km', '2026-10-15'], ['🏆 Biggest single climb', '849 m', '2026-10-17']]);
  });
  it('renders distance and pace for heart rate and ascent records in both languages', async () => {
    const longest = { value: 9, day: '2026-10-17' };
    const fastest = { value: 300, day: '2026-10-16' };
    const detailed = { ...records, prs: [
      { key: 'lowestAvgHr', value: 120, day: longest.day, longest, fastest },
      { key: 'mostAscentM', value: 849, day: longest.day, longest, fastest: null },
    ] };
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ data: { ...summary, records: detailed } }) }));
    const page = setup(fetcher);
    page.details.open = true;
    await vi.waitFor(() => expect(page.section.textContent).toContain('120.00 bpm'));
    expect(page.section.textContent).toContain('最低平均心率');
    expect(page.section.textContent).toContain('最長距離 9.00 km · 2026-10-17');
    expect(page.section.textContent).toContain('最快配速 5:00 /km · 2026-10-16');
    expect(page.section.textContent).toContain('最快配速 —');
    page.english();
    expect(page.section.textContent).toContain('Lowest average heart rate');
    expect(page.section.textContent).toContain('Biggest single climb');
    expect(page.section.textContent).toContain('Longest distance 9.00 km');
    expect(page.section.textContent).toContain('Fastest pace 5:00 /km');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('shows streaks only for distances that were ever reached', () => {
    expect(streakTiles(records, 'zh').map(t => [t.label, t.value, t.note])).toEqual([
      ['🔥 連續每週 10 km 以上', '3 週', '歷史最佳 5 週'], ['🔥 連續運動天數', '2 天', '歷史最佳 4 天']]);
  });
  it('hides ended streaks even when they have a historical best', () => {
    const ended = { ...records, dayStreak: 0, weekStreaks: [{ km: 10, current: 0, best: 5 }] };
    expect(streakTiles(ended, 'zh')).toEqual([]);
    expect(streakTiles(records, 'en').every(tile => tile.status === 'On streak')).toBe(true);
    expect(streakTiles(records, 'zh').every(tile => tile.status === '連續中')).toBe(true);
  });
  it('labels the monthly distance axis and scales bars against its top tick', async () => {
    const monthly = { ...records, months: [{ month: '2026-10', runKm: 43.64, hikeKm: 8.50 }] };
    const page = setup(vi.fn(async () => ({ ok: true, json: async () => ({ data: { ...summary, records: monthly } }) })));
    page.details.open = true;
    await vi.waitFor(() => expect(page.root.querySelector('.health-month')).not.toBeNull());
    const ticks = [...page.root.querySelectorAll('.health-axis-tick')].map(tick => tick.textContent);
    expect(ticks).toEqual(['0', '10', '20', '30', '40', '50', '60']);
    const bar = page.root.querySelector<HTMLElement>('.health-month')!;
    expect(parseFloat(bar.style.getPropertyValue('--h'))).toBeCloseTo(52.14 / 60 * 100);
    expect(page.root.querySelector('.health-axis-unit')?.textContent).toBe('km');
  });
  it('draws records, streaks and a monthly running-and-hiking chart from the summary', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ data: { ...summary, records } }) }));
    const page = setup(fetcher);
    page.details.open = true;
    await vi.waitFor(() => expect(page.root.querySelectorAll('.health-month')).toHaveLength(2));
    expect(page.section.textContent).toContain('個人紀錄');
    expect(page.section.textContent).toContain('連續紀錄');
    expect(page.root.querySelectorAll('.health-streak-status')).toHaveLength(2);
    expect(page.section.textContent).not.toContain('總里程');
    page.root.querySelectorAll<HTMLButtonElement>('.health-month')[0].click();
    expect(page.root.querySelectorAll('.health-readout')[1].textContent).toContain('跑步 40.00 km，健行 10.00 km');
    page.english();
    expect(page.section.textContent).toContain('Personal records');
  });
  it('groups the records under speed, single outings and volume, skipping empty groups', () => {
    const groups = recordGroups({ ...records, prs: [...records.prs, { key: 'bestWeekKm', value: 31, day: '2026-11-02' }] }, 'zh');
    expect(groups.map(g => g.title)).toEqual(['速度與心率', '單次距離與爬升', '累積']);
    expect(groups[0].tiles).toHaveLength(2);
    expect(recordGroups({ ...records, prs: [{ key: 'bestWeekKm', value: 31, day: '2026-11-02' }] }, 'en').map(g => g.title)).toEqual(['Volume']);
  });
  it('tells the story in order: this week, months, records, streaks, daily activity', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ data: { ...summary, records, other } }) }));
    const page = setup(fetcher);
    page.details.open = true;
    await vi.waitFor(() => expect(page.root.querySelectorAll('.health-block')).toHaveLength(5));
    expect([...page.root.querySelectorAll('.health-block-title')].map(h => h.textContent)).toEqual(['本週', '每月距離', '個人紀錄', '連續紀錄', '日常活動']);
    expect(page.root.querySelector('.health-legend')!.textContent).toContain('健行');
    expect(page.root.querySelector('.health-bar.is-current')).not.toBeNull();
    expect(page.root.querySelector('.health-hero-value')!.textContent).toBe('4.00 km');
  });
});
