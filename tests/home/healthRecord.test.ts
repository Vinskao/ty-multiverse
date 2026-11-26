import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { activityBars, formatPace, initHealthRecord, metricCharts, runningTiles, type HealthOther, type HealthSummary } from '../../src/scripts/home/healthRecord';

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
    expect(runningTiles(summary, 'zh').map(t => t.value)).toEqual(['11.00 km', '5:00 /km', '4.00 km', '21.00 km', '26.50 km']);
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
    expect(page.section.textContent).toContain('其他健康資料');
    expect(page.section.textContent).not.toContain('Palais');
    page.root.querySelectorAll<HTMLButtonElement>('.health-spark-bar')[0].click();
    expect(page.root.querySelector('.health-spark-card .health-readout')!.textContent).toContain('30,000');
    page.english();
    expect(page.section.textContent).toContain('Other health data');
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
    expect(page.section.textContent).toContain('Longest day');
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
});
