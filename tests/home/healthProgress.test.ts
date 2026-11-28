import { describe, expect, it } from 'vitest';
import { formatDuration, progress, sportsIn, type Workout } from '../../src/scripts/home/healthProgress';

const w = (activity: string, day: string, km: number, seconds: number, ascentM: number | null = null): Workout => ({ activity, day, km, seconds, ascentM });
const today = '2026-11-28'; // a Saturday; the week started Monday 11-23

describe('health progress (Strava-style)', () => {
  const workouts = [
    w('Running', '2026-11-24', 5, 1800, 10), w('Hiking', '2026-11-25', 8.6, 3840, 22), // this week
    w('Running', '2026-11-03', 6, 2000), // week of 11-02
    w('Running', '2026-11-17', 3, 1000), // last week
    w('Walking', '2026-09-01', 2, 1200), // older than 12 weeks
  ];

  it('totals this week for the chosen sport: distance, time and climb', () => {
    expect(progress(workouts, 'all', today).week).toEqual({ km: 13.6, seconds: 5640, ascentM: 32 });
    expect(progress(workouts, 'Running', today).week).toEqual({ km: 5, seconds: 1800, ascentM: 10 });
  });

  it('gives 12 weekly points ending this week, with zeros for empty weeks', () => {
    const weeks = progress(workouts, 'Running', today).weeks;
    expect(weeks).toHaveLength(12);
    expect(weeks.at(-1)).toEqual({ start: '2026-11-23', km: 5 });
    expect(weeks.at(-2)).toEqual({ start: '2026-11-16', km: 3 });
    expect(weeks.at(-3)!.km).toBe(0);
    expect(weeks.at(-4)).toEqual({ start: '2026-11-02', km: 6 });
  });

  it('counts consecutive active weeks, all sports, still alive when this week is empty', () => {
    expect(progress(workouts, 'Running', today).streakWeeks).toBe(2); // 11-23 and 11-16; 11-09 empty
    expect(progress([w('Running', '2026-11-17', 3, 1000)], 'all', today).streakWeeks).toBe(1);
    expect(progress([], 'all', today).streakWeeks).toBe(0);
  });

  it('marks active days of this month on a Monday-first grid', () => {
    const { month } = progress(workouts, 'all', today);
    expect(month[0][0]).toBeNull(); // 11-01 is a Sunday, so the first row starts with six blanks
    expect(month[0][6]).toEqual({ day: '2026-11-01', active: false, today: false, future: false });
    const cells = month.flat().filter(Boolean);
    expect(cells.filter(c => c!.active).map(c => c!.day)).toEqual(['2026-11-03', '2026-11-17', '2026-11-24', '2026-11-25']);
    expect(cells.find(c => c!.today)!.day).toBe(today);
    expect(cells.find(c => c!.day === '2026-11-30')!.future).toBe(true);
  });

  it('offers only the sports that appear, in a fixed order', () => {
    expect(sportsIn(workouts)).toEqual(['all', 'Running', 'Hiking', 'Walking']);
  });

  it('formats time like 1小時 34分', () => {
    expect(formatDuration(5640, 'zh')).toBe('1小時 34分');
    expect(formatDuration(1800, 'zh')).toBe('30分');
    expect(formatDuration(5640, 'en')).toBe('1h 34m');
  });
});

import { initHealthRecord } from '../../src/scripts/home/healthRecord';
describe('progress panel on the page', () => {
  it('draws chips, this week, the 12-week line and the streak, and filters by sport', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<details open><section data-health-record hidden><p data-health-status hidden></p><div data-health-body></div></section></details>';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
    const data = { running: { runs: 1, totalKm: 5, peakDay: null, fastest: null, thisWeekKm: 5, peakWeek: null, weeks: [], lastRun: today },
      workouts: [w('Running', today, 5, 1800, 10), w('Hiking', today, 8.6, 3840, 22)] };
    const fetcher = async () => new Response(JSON.stringify({ data }));
    initHealthRecord(root, { fetch: fetcher as any, lang: () => 'zh', onLang: () => {} }, 'https://x/tymb');
    await new Promise(r => setTimeout(r, 0));
    const body = root.querySelector('[data-health-body]')!;
    expect([...body.querySelectorAll('.hp-chip')].map(c => c.textContent)).toEqual(['◎ 所有運動', '👟 跑步', '🥾 健行']);
    expect([...body.querySelectorAll('.hp-stat dd')].map(d => d.textContent)).toEqual(['13.60 公里', '1小時 34分', '32 公尺']);
    expect(body.querySelectorAll('.hp-dot')).toHaveLength(12);
    expect(body.querySelector('.hp-flame-num')!.textContent).toBe('1');
    (body.querySelectorAll<HTMLButtonElement>('.hp-chip')[1]).click();
    expect(root.querySelector('.hp-stat dd')!.textContent).toBe('5.00 公里');
  });
});
