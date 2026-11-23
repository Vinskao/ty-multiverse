import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { formatPace, initHealthRecord, metricTiles, runningTiles, type HealthSummary } from '../../src/scripts/home/healthRecord';

const weeks = Array.from({ length: 12 }, (_, i) => ({ start: `2026-09-${String(i + 1).padStart(2, '0')}`, km: i }));
const summary: HealthSummary = {
  running: { runs: 3, totalKm: 26.5, peakDay: { day: '2026-11-01', km: 11 }, fastest: { day: '2026-11-02', km: 5, secondsPerKm: 299.6 },
    thisWeekKm: 4, peakWeek: { start: '2026-10-26', km: 21 }, weeks, lastRun: '2026-11-02' },
  activities: [], metrics: [{ metric: 'StepCount', unit: 'count', peak: 30000, peak_day: '2026-11-01', average30: null }],
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
    expect(metricTiles(summary, 'en')[0]).toEqual({ label: 'Steps', value: '30,000', note: 'Best day 2026-11-01; 30-day daily average —' });
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
  it('caps the chart size', () => {
    expect(readFileSync('src/components/HealthRecord.astro', 'utf8')).toMatch(/\.health-chart \{[^}]*max-width/);
  });
});
