import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { formatPace, initHealthRecord, mayReadOverview, overviewTiles, runningTiles, type HealthOverview, type HealthSummary } from '../../src/scripts/home/healthRecord';

const weeks = Array.from({ length: 12 }, (_, i) => ({ start: `2026-09-${String(i + 1).padStart(2, '0')}`, km: i }));
const summary: HealthSummary = {
  running: { runs: 3, totalKm: 26.5, peakDay: { day: '2026-11-01', km: 11 }, fastest: { day: '2026-11-02', km: 5, secondsPerKm: 299.6 },
    thisWeekKm: 4, peakWeek: { start: '2026-10-26', km: 21 }, weeks, lastRun: '2026-11-02' },
};
const overview: HealthOverview = {
  activities: [{ activity: 'Running', sessions: 3, km: 26.5, hours: 3 }, { activity: 'CoreTraining', sessions: 2, km: 0, hours: 1.5 }],
  metrics: [{ metric: 'StepCount', unit: 'count', last_day: '2026-11-02', latest: 8000, peak: 30000, peak_day: '2026-11-01', average30: null }],
};
const jwt = (roles: string[]) => `x.${btoa(JSON.stringify({ realm_access: { roles } }))}.y`;
const setup = (fetcher: any, token: string | null = null) => {
  let lang: 'zh' | 'en' = 'zh';
  let changed = () => {};
  const root = document.createElement('div');
  root.innerHTML = '<details><section data-health-record hidden><p data-health-status hidden></p><div data-health-body></div></section></details>';
  initHealthRecord(root, { fetch: fetcher, lang: () => lang, onLang: callback => { changed = callback; }, token: () => token }, 'https://x/tymb');
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
    expect(overviewTiles(overview, 'en')).toEqual([
      { label: 'Core Training', value: '1.50 h', note: '2 sessions, 1.50 hours' },
      { label: 'Steps', value: '8,000', note: '2026-11-02; 30-day average —; peak 30,000 (2026-11-01)' }]);
  });
  it('asks for the private overview only with Palais access, and keeps the public part when refused', async () => {
    expect([null, 'bad', jwt(['member'])].map(mayReadOverview)).toEqual([false, false, false]);
    expect(mayReadOverview(jwt(['manage-users']))).toBe(true);
    const answer = (ok: boolean) => vi.fn(async (url: string) => (url.endsWith('/summary')
      ? { ok: true, json: async () => ({ data: summary }) } : { ok, json: async () => ({ data: overview }) }));
    const member = answer(true);
    const plain = setup(member, jwt(['member']));
    plain.details.open = true;
    await vi.waitFor(() => expect(plain.root.querySelectorAll('.health-bar')).toHaveLength(12));
    expect(member).toHaveBeenCalledTimes(1);
    const allowed = setup(answer(true), jwt(['palais-checker']));
    allowed.details.open = true;
    await vi.waitFor(() => expect(allowed.section.textContent).toContain('步數'));
    const refused = setup(answer(false), jwt(['palais-checker']));
    refused.details.open = true;
    await vi.waitFor(() => expect(refused.root.querySelectorAll('.health-bar')).toHaveLength(12));
    expect(refused.section.textContent).not.toContain('步數');
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
