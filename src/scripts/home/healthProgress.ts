/** Strava-style "progress" panel: per-sport this-week totals, a 12-week distance line, the weekly streak and this month's active days. */
export type Workout = { activity: string; day: string; km: number; seconds: number | null; ascentM: number | null };
export type Sport = 'all' | 'Running' | 'Hiking' | 'Walking' | 'Cycling';
export type DayCell = { day: string; active: boolean; today: boolean; future: boolean } | null;
export type Progress = {
  week: { km: number; seconds: number; ascentM: number };
  weeks: { start: string; km: number }[];
  streakWeeks: number;
  month: DayCell[][];
};

export const SPORTS: Sport[] = ['all', 'Running', 'Hiking', 'Walking', 'Cycling'];
export const SPORT_LABELS: Record<Sport, [string, string, string]> = {
  all: ['所有運動', 'All sports', '◎'], Running: ['跑步', 'Running', '👟'], Hiking: ['健行', 'Hiking', '🥾'],
  Walking: ['步行', 'Walking', '🚶'], Cycling: ['騎車', 'Cycling', '🚲'],
};

const DAY = 86400000;
const parse = (day: string) => Date.parse(day.slice(0, 10) + 'T00:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const monday = (ms: number) => ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY;
const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

export function sportsIn(workouts: Workout[]): Sport[] {
  return SPORTS.filter(s => s === 'all' || workouts.some(w => w.activity === s));
}

export function progress(workouts: Workout[], sport: Sport, today: string): Progress {
  const now = parse(today);
  const thisWeek = monday(now);
  const mine = workouts.filter(w => sport === 'all' || w.activity === sport);
  const inWeek = mine.filter(w => monday(parse(w.day)) === thisWeek);
  const week = {
    km: round(inWeek.reduce((s, w) => s + (w.km || 0), 0)),
    seconds: Math.round(inWeek.reduce((s, w) => s + (w.seconds || 0), 0)),
    ascentM: Math.round(inWeek.reduce((s, w) => s + (w.ascentM || 0), 0)),
  };
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = thisWeek - (11 - i) * 7 * DAY;
    return { start: iso(start), km: round(mine.filter(w => monday(parse(w.day)) === start).reduce((s, w) => s + (w.km || 0), 0)) };
  });

  // Like Strava, the streak counts weeks with any activity; an empty current week does not break it yet.
  const active = new Set(workouts.map(w => monday(parse(w.day))));
  let cursor = active.has(thisWeek) ? thisWeek : thisWeek - 7 * DAY;
  let streakWeeks = 0;
  while (active.has(cursor)) { streakWeeks++; cursor -= 7 * DAY; }

  const activeDays = new Set(mine.map(w => w.day.slice(0, 10)));
  const date = new Date(now);
  const first = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const last = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);
  const cells: DayCell[] = Array.from({ length: (new Date(first).getUTCDay() + 6) % 7 }, () => null);
  for (let ms = first; ms <= last; ms += DAY) {
    const day = iso(ms);
    cells.push({ day, active: activeDays.has(day), today: ms === now, future: ms > now });
  }
  while (cells.length % 7) cells.push(null);
  const month = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
  return { week, weeks, streakWeeks, month };
}

export function formatDuration(seconds: number, lang: 'zh' | 'en'): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return lang === 'zh' ? (h ? `${h}小時 ${m}分` : `${m}分`) : (h ? `${h}h ${m}m` : `${m}m`);
}
