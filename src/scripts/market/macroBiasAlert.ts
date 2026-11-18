// 2026-11-18: warns when the TAIEX closes below two moving averages for the first time on the same day (e.g. 半年線 and
// 年線 together). A line is "broken" on a day when its bias turns negative after a non-negative previous session. The
// warning stays for ALERT_DAYS calendar days from that day. Covered by tests/market/macroBiasAlert.test.ts.
import type { MacroHistoryRow } from './macroSeries';

export const ALERT_DAYS = 7;
export const BIAS_LINES = [
    { code: 'TW_TAIEX_BIAS_20', zh: '月線', en: '20-day' },
    { code: 'TW_TAIEX_BIAS_60', zh: '季線', en: '60-day' },
    { code: 'TW_TAIEX_BIAS_120', zh: '半年線', en: '120-day' },
    { code: 'TW_TAIEX_BIAS_240', zh: '年線', en: '240-day' },
] as const;
export type BiasBreak = { date: string; lines: { zh: string; en: string }[] };

/** The latest day two or more averages were broken at once, if it is within ALERT_DAYS of `today` (YYYY-MM-DD). */
export function biasBreakAlert(histories: Record<string, MacroHistoryRow[] | undefined>, today: string): BiasBreak | null {
    const byDay = new Map<string, { zh: string; en: string }[]>();
    for (const line of BIAS_LINES) {
        const rows = (histories[line.code] ?? []).map((row) => ({ period: row.period, value: Number(row.value) }))
            .filter((row) => Number.isFinite(row.value)).sort((a, b) => a.period.localeCompare(b.period));
        for (let index = 1; index < rows.length; index++) {
            if (rows[index].value < 0 && rows[index - 1].value >= 0) byDay.set(rows[index].period, [...(byDay.get(rows[index].period) ?? []), line]);
        }
    }
    const limit = Date.parse(today) - ALERT_DAYS * 86400000;
    const days = [...byDay].filter(([date, lines]) => lines.length >= 2 && Date.parse(date) > limit && date <= today).sort((a, b) => b[0].localeCompare(a[0]));
    return days.length ? { date: days[0][0], lines: days[0][1].map(({ zh, en }) => ({ zh, en })) } : null;
}
